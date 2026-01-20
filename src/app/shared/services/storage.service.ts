import { Injectable } from '@angular/core';

/**
 * Type-safe wrapper for localStorage.
 * Handles JSON serialization/deserialization automatically.
 *
 * Usage:
 * ```typescript
 * constructor(private storage: StorageService) {}
 *
 * // Store data
 * this.storage.set('user', { name: 'John', age: 30 });
 * this.storage.set('token', 'abc123');
 *
 * // Retrieve data
 * const user = this.storage.get<User>('user');
 * const token = this.storage.get<string>('token');
 *
 * // Remove data
 * this.storage.remove('token');
 *
 * // Clear all
 * this.storage.clear(['theme', 'language']); // Keep only these keys
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly PREFIX = 'lms_'; // Namespace to avoid conflicts

  /**
   * Store value in localStorage
   * Automatically handles JSON serialization
   */
  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this.PREFIX + key, serialized);
    } catch (error) {
      console.error(`Error storing key "${key}":`, error);
    }
  }

  /**
   * Retrieve value from localStorage
   * Automatically handles JSON deserialization
   * Returns null if key doesn't exist
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      if (item === null) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error retrieving key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove value from localStorage
   */
  remove(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return localStorage.getItem(this.PREFIX + key) !== null;
  }

  /**
   * Clear all stored data (except specified keys to keep)
   *
   * @param keysToKeep - Array of keys to preserve (without prefix)
   */
  clear(keysToKeep: string[] = []): void {
    const preserveKeys = keysToKeep.map((k) => this.PREFIX + k);
    const allKeys = Object.keys(localStorage);

    allKeys.forEach((key) => {
      if (key.startsWith(this.PREFIX) && !preserveKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Get all keys (without prefix)
   */
  getAllKeys(): string[] {
    const allKeys = Object.keys(localStorage);
    return allKeys
      .filter((key) => key.startsWith(this.PREFIX))
      .map((key) => key.substring(this.PREFIX.length));
  }

  /**
   * Get storage size in bytes (approximate)
   */
  getSize(): number {
    let size = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith(this.PREFIX)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  }
}
