import { v4 as uuidv4 } from 'uuid';
import type { Collection, ApiRequest } from '../shared/models';
import { STORAGE_KEYS } from '../shared/constants';
import type { StorageService } from './StorageService';

export class CollectionService {
  constructor(private storage: StorageService) {}

  async getAll(): Promise<Collection[]> {
    return (await this.storage.getGlobal<Collection[]>(STORAGE_KEYS.COLLECTIONS)) || [];
  }

  async getById(id: string): Promise<Collection | undefined> {
    const collections = await this.getAll();
    return collections.find((c) => c.id === id);
  }

  async save(collection: Collection): Promise<void> {
    const collections = await this.getAll();
    const index = collections.findIndex((c) => c.id === collection.id);
    collection.updatedAt = new Date().toISOString();

    if (index >= 0) {
      collections[index] = collection;
    } else {
      collection.createdAt = collection.createdAt || new Date().toISOString();
      collections.push(collection);
    }

    await this.storage.setGlobal(STORAGE_KEYS.COLLECTIONS, collections);
  }

  async create(name: string): Promise<Collection> {
    const collection: Collection = {
      id: uuidv4(),
      name,
      folders: [],
      requests: [],
      variables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.save(collection);
    return collection;
  }

  async delete(id: string): Promise<void> {
    const collections = await this.getAll();
    const filtered = collections.filter((c) => c.id !== id);
    await this.storage.setGlobal(STORAGE_KEYS.COLLECTIONS, filtered);
  }

  async addRequest(collectionId: string, request: ApiRequest): Promise<void> {
    const collection = await this.getById(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }
    request.id = request.id || uuidv4();
    request.collectionId = collectionId;

    const existingIdx = collection.requests.findIndex((r) => r.id === request.id);
    if (existingIdx >= 0) {
      collection.requests[existingIdx] = request;
    } else {
      collection.requests.push(request);
    }
    await this.save(collection);
  }

  async removeRequest(collectionId: string, requestId: string): Promise<void> {
    const collection = await this.getById(collectionId);
    if (!collection) { return; }
    collection.requests = collection.requests.filter((r) => r.id !== requestId);
    this.removeRequestFromFolders(collection.folders, requestId);
    await this.save(collection);
  }

  async importCollection(json: string): Promise<Collection> {
    const data = JSON.parse(json);

    if (data.info && data.item) {
      const postmanCollection = this.importPostmanCollection(data);
      await this.save(postmanCollection);
      return postmanCollection;
    }

    const collection: Collection = {
      id: uuidv4(),
      name: data.name || 'Imported Collection',
      folders: data.folders || [],
      requests: (data.requests || []).map((r: any) => ({ ...r, id: r.id || uuidv4() })),
      variables: data.variables || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.save(collection);
    return collection;
  }

  async exportCollection(id: string): Promise<string> {
    const collection = await this.getById(id);
    if (!collection) {
      throw new Error(`Collection ${id} not found`);
    }
    return JSON.stringify(collection, null, 2);
  }

  private importPostmanCollection(data: any): Collection {
    const requests: ApiRequest[] = [];
    this.extractPostmanRequests(data.item, requests);

    const collection: Collection = {
      id: uuidv4(),
      name: data.info?.name || 'Imported Postman Collection',
      folders: [],
      requests,
      variables: (data.variable || []).map((v: any) => ({
        key: v.key,
        value: v.value || '',
        enabled: true,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return collection;
  }

  private extractPostmanRequests(items: any[], requests: ApiRequest[]): void {
    if (!items) { return; }
    for (const item of items) {
      if (item.item) {
        this.extractPostmanRequests(item.item, requests);
      } else if (item.request) {
        const req = item.request;
        const url = typeof req.url === 'string' ? req.url : req.url?.raw || '';

        requests.push({
          id: uuidv4(),
          name: item.name || 'Imported Request',
          method: (req.method || 'GET').toUpperCase() as any,
          url,
          headers: (req.header || []).map((h: any) => ({
            key: h.key,
            value: h.value,
            enabled: !h.disabled,
          })),
          params: (req.url?.query || []).map((q: any) => ({
            key: q.key,
            value: q.value || '',
            enabled: !q.disabled,
          })),
          body: {
            type: req.body?.mode === 'raw' ? 'json' : 'none',
            content: req.body?.raw || '',
          },
          auth: { type: 'none' },
        });
      }
    }
  }

  private removeRequestFromFolders(
    folders: Collection['folders'],
    requestId: string
  ): void {
    for (const folder of folders) {
      folder.requests = folder.requests.filter((r) => r.id !== requestId);
      this.removeRequestFromFolders(folder.folders, requestId);
    }
  }
}
