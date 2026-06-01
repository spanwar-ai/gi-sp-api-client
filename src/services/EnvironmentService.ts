import { v4 as uuidv4 } from 'uuid';
import type { Environment, KeyValue } from '../shared/models';
import { STORAGE_KEYS } from '../shared/constants';
import type { StorageService } from './StorageService';
import { interpolate } from '../utils/variableInterpolation';

export class EnvironmentService {
  constructor(private storage: StorageService) {}

  async getAll(): Promise<Environment[]> {
    return (await this.storage.getGlobal<Environment[]>(STORAGE_KEYS.ENVIRONMENTS)) || [];
  }

  async getActive(): Promise<Environment | undefined> {
    const environments = await this.getAll();
    return environments.find((e) => e.isActive);
  }

  async getActiveVariables(): Promise<KeyValue[]> {
    const active = await this.getActive();
    return active?.variables || [];
  }

  async save(environment: Environment): Promise<void> {
    const environments = await this.getAll();
    const index = environments.findIndex((e) => e.id === environment.id);

    if (index >= 0) {
      environments[index] = environment;
    } else {
      environments.push(environment);
    }

    await this.storage.setGlobal(STORAGE_KEYS.ENVIRONMENTS, environments);
  }

  async create(name: string): Promise<Environment> {
    const environment: Environment = {
      id: uuidv4(),
      name,
      variables: [],
      isActive: false,
    };
    await this.save(environment);
    return environment;
  }

  async delete(id: string): Promise<void> {
    const environments = await this.getAll();
    const filtered = environments.filter((e) => e.id !== id);
    await this.storage.setGlobal(STORAGE_KEYS.ENVIRONMENTS, filtered);
  }

  async setActive(id: string | null): Promise<void> {
    const environments = await this.getAll();
    for (const env of environments) {
      env.isActive = env.id === id;
    }
    await this.storage.setGlobal(STORAGE_KEYS.ENVIRONMENTS, environments);
  }

  resolveVariables(input: string, variables: KeyValue[]): string {
    return interpolate(input, variables);
  }
}
