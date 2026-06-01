import axios from 'axios';
import type { StorageService } from './StorageService';

// ── Google Apps Script Web App configuration (fill in before publishing) ──
// 1. Open the sheet in Google Sheets.
// 2. Extensions → Apps Script → paste the script from SETUP.md.
// 3. Deploy → New deployment → type: Web app → execute as ME → access: Anyone.
// 4. Copy the deployment URL into SCRIPT_URL below.
// 5. Set SHARED_TOKEN to any random 32+ char string and put the SAME value in the script.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkkb3BWfxtpx3O4EsNqk32JMc-xlTTC6xFAvj4eIGJ23Frb-lvX_MND0Tdm3L5VyXBLA/exec';
const SHARED_TOKEN = '3bCfRu2Rvr0Gzt72cXnlMuiMEluJXKeYXeMWv2nRLns';
// ─────────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'GISPRest.licenseCache';
const OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

export type LicenseRole = 'admin' | 'user';

export interface LicenseStatus {
  valid: boolean;
  role: LicenseRole | null;
  expiryDate: string | null;
  source: 'sheet' | 'cache' | 'none';
}

interface CachedLicense {
  role: LicenseRole;
  expiryDate: string;
  lastVerifiedAt: number;
}

export class LicenseService {
  constructor(private storage: StorageService) {}

  private isConfigured(): boolean {
    return !SCRIPT_URL.includes('__PASTE') && !SHARED_TOKEN.includes('__PASTE');
  }

  async checkActivation(machineId: string): Promise<LicenseStatus> {
    if (!this.isConfigured()) {
      // Allow ActivationService to fall back to local-only activation
      // until the publisher configures the Apps Script Web App.
      return { valid: false, role: null, expiryDate: null, source: 'none' };
    }

    try {
      const response = await axios.get(SCRIPT_URL, {
        params: { action: 'check', token: SHARED_TOKEN, machineId },
        timeout: 15000,
      });
      const data = response.data || {};
      if (data.error) {
        throw new Error(data.error);
      }
      const valid = !!data.valid;
      const role = (data.role === 'admin' || data.role === 'user') ? data.role : null;
      const expiryDate = data.expiryDate || null;

      if (valid && role && expiryDate) {
        await this.saveCache({ role, expiryDate, lastVerifiedAt: Date.now() });
      }
      return { valid, role, expiryDate, source: 'sheet' };
    } catch {
      // Network/quota failure — fall back to cached license inside the grace window.
      const cached = await this.loadCache();
      if (cached && Date.now() - cached.lastVerifiedAt < OFFLINE_GRACE_MS) {
        const valid = new Date(cached.expiryDate).getTime() > Date.now();
        return { valid, role: cached.role, expiryDate: cached.expiryDate, source: 'cache' };
      }
      return { valid: false, role: null, expiryDate: null, source: 'none' };
    }
  }

  async registerActivation(
    machineId: string,
    hostname: string,
    username: string,
    role: LicenseRole,
    usedCode: string
  ): Promise<{ expiryDate: string }> {
    if (!this.isConfigured()) {
      // Offline / unconfigured — write a local cache so the UI still flips to activated.
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await this.saveCache({ role, expiryDate, lastVerifiedAt: Date.now() });
      return { expiryDate };
    }

    const response = await axios.get(SCRIPT_URL, {
      params: {
        action: 'register',
        token: SHARED_TOKEN,
        machineId,
        hostname,
        username,
        role,
        usedCode,
      },
      timeout: 15000,
    });
    const data = response.data || {};
    if (data.error) {
      throw new Error(data.error);
    }
    const expiryDate: string = data.expiryDate;
    await this.saveCache({ role, expiryDate, lastVerifiedAt: Date.now() });
    return { expiryDate };
  }

  private async loadCache(): Promise<CachedLicense | null> {
    const raw = await this.storage.getSecret(CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedLicense;
    } catch {
      return null;
    }
  }

  private async saveCache(cache: CachedLicense): Promise<void> {
    await this.storage.setSecret(CACHE_KEY, JSON.stringify(cache));
  }

  async clearCache(): Promise<void> {
    await this.storage.deleteSecret(CACHE_KEY);
  }
}
