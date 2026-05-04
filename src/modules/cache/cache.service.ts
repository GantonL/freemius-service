import { Injectable } from "@danet/core";

@Injectable()
export class CacheService {
  private readonly store = new Map<string, unknown>();
  private static readonly MAX_SIZE = 1000;

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    if (this.store.size >= CacheService.MAX_SIZE) {
      this.store.delete(this.store.keys().next().value!);
    }
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
