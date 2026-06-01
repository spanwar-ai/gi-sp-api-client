import * as os from 'os';
import * as nodemailer from 'nodemailer';
import * as vscode from 'vscode';
import type { StorageService } from './StorageService';
import type { LicenseService, LicenseRole } from './LicenseService';

const ACTIVATION_ROLE_KEY = 'GISPRest.role';

// ── SMTP Configuration (embedded in build) ──────────
const SMTP_EMAIL = 'spanwar.ai@gmail.com';
const SMTP_PASSWORD = 'ahrp ijpx fgca sorx';
// ─────────────────────────────────────────────────────

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface ActivationStatus {
  activated: boolean;
  role: LicenseRole | null;
  expiryDate: string | null;
}

export interface VerifyResult {
  success: boolean;
  role: LicenseRole | null;
  attemptsLeft: number;
}

export class ActivationService {
  private adminCode: string | null = null;
  private userCode: string | null = null;
  private codeGeneratedAt = 0;
  private attempts = 0;
  private cachedStatus: ActivationStatus | null = null;

  constructor(
    private storage: StorageService,
    private licenseService: LicenseService
  ) {}

  async getStatus(forceRefresh = false): Promise<ActivationStatus> {
    if (this.cachedStatus && !forceRefresh) return this.cachedStatus;

    const machineId = vscode.env.machineId;
    const license = await this.licenseService.checkActivation(machineId);
    this.cachedStatus = {
      activated: license.valid,
      role: license.role,
      expiryDate: license.expiryDate,
    };

    if (license.valid && license.role) {
      await this.storage.setSecret(ACTIVATION_ROLE_KEY, license.role);
    }
    return this.cachedStatus;
  }

  async generateAndSendCode(): Promise<void> {
    this.adminCode = String(Math.floor(100000 + Math.random() * 900000));
    this.userCode = String(Math.floor(100000 + Math.random() * 900000));
    // Ensure the two codes never collide
    while (this.userCode === this.adminCode) {
      this.userCode = String(Math.floor(100000 + Math.random() * 900000));
    }
    this.codeGeneratedAt = Date.now();
    this.attempts = 0;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    const mailOptions = {
      from: `"GI-SP REST & SOAP Client" <${SMTP_EMAIL}>`,
      to: SMTP_EMAIL,
      subject: 'GI-SP REST & SOAP Client — Activation Codes',
      html: [
        '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">',
        '<h2 style="color:#007acc;margin:0 0 16px;">GI-SP REST & SOAP Client Activation</h2>',
        '<p>Someone is requesting to activate the extension. Share <b>one</b> of the codes below:</p>',
        '<table style="width:100%;border-collapse:collapse;margin:16px 0;">',
        '<tr>',
        '<td style="padding:12px;background:#fff7e6;border:1px solid #f0c060;border-radius:8px;width:50%;text-align:center;">',
        '<div style="font-size:11px;color:#a06000;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Admin Code</div>',
        `<div style="font-size:30px;font-weight:bold;letter-spacing:6px;margin-top:8px;color:#a06000;">${this.adminCode}</div>`,
        '<div style="font-size:11px;color:#a06000;margin-top:6px;">Full access: Collections, History, Environments</div>',
        '</td>',
        '<td style="width:8px;"></td>',
        '<td style="padding:12px;background:#eef5ff;border:1px solid #6090c0;border-radius:8px;width:50%;text-align:center;">',
        '<div style="font-size:11px;color:#205090;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">User Code</div>',
        `<div style="font-size:30px;font-weight:bold;letter-spacing:6px;margin-top:8px;color:#205090;">${this.userCode}</div>`,
        '<div style="font-size:11px;color:#205090;margin-top:6px;">Request &amp; response only</div>',
        '</td>',
        '</tr></table>',
        '<table style="font-size:13px;color:#555;width:100%;">',
        `<tr><td style="padding:4px 8px;"><b>Machine ID</b></td><td>${vscode.env.machineId}</td></tr>`,
        `<tr><td style="padding:4px 8px;"><b>Hostname</b></td><td>${os.hostname()}</td></tr>`,
        `<tr><td style="padding:4px 8px;"><b>User</b></td><td>${os.userInfo().username}</td></tr>`,
        `<tr><td style="padding:4px 8px;"><b>Time</b></td><td>${new Date().toLocaleString()}</td></tr>`,
        '</table>',
        '<p style="font-size:12px;color:#999;margin-top:16px;">Codes expire in 10 minutes. The activation is valid for 30 days and can be extended in the Google Sheet.</p>',
        '</div>',
      ].join(''),
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET') {
        throw new Error(
          'Could not reach the mail server. Your network appears to be blocking SMTP (port 465). Try a different network (e.g. mobile hotspot) or contact your IT/network admin.'
        );
      }
      if (code === 'EAUTH') {
        throw new Error('Mail server rejected authentication. Please contact the extension publisher.');
      }
      throw new Error(`Failed to send activation code: ${err?.message ?? 'unknown error'}`);
    }
  }

  async verifyCode(code: string): Promise<VerifyResult> {
    if (
      (!this.adminCode && !this.userCode) ||
      Date.now() - this.codeGeneratedAt > CODE_EXPIRY_MS
    ) {
      this.adminCode = null;
      this.userCode = null;
      return { success: false, role: null, attemptsLeft: 0 };
    }

    this.attempts++;
    if (this.attempts > MAX_ATTEMPTS) {
      this.adminCode = null;
      this.userCode = null;
      return { success: false, role: null, attemptsLeft: 0 };
    }

    let role: LicenseRole | null = null;
    if (code === this.adminCode) role = 'admin';
    else if (code === this.userCode) role = 'user';

    if (!role) {
      return { success: false, role: null, attemptsLeft: MAX_ATTEMPTS - this.attempts };
    }

    // Match — register in the sheet (or cache locally if unconfigured)
    try {
      await this.licenseService.registerActivation(
        vscode.env.machineId,
        os.hostname(),
        os.userInfo().username,
        role,
        code
      );
    } catch {
      // The license cache fallback inside LicenseService handles this; swallow.
    }

    await this.storage.setSecret(ACTIVATION_ROLE_KEY, role);
    this.adminCode = null;
    this.userCode = null;
    this.cachedStatus = null; // force a fresh read next time

    return { success: true, role, attemptsLeft: MAX_ATTEMPTS - this.attempts };
  }
}
