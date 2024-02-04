import { isObjectLike } from 'lodash';
import { LRUCache } from 'lru-cache';
import { ServerCache } from './ServerCache';

export interface IMemoryCacheOptions {
  maxSize?: number;
  length?: (value: any, key: string) => number;
  groupPrefix?: string;
}

function defaultLengthCalculation(item: any) {
  if (Array.isArray(item) || typeof item === 'string') {
    return item.length;
  }
  return 1;
}

function isJSON(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export class MemoryCache extends ServerCache<string> {
  public readonly client: LRUCache<string, any>;

  constructor({ maxSize = Infinity, length = defaultLengthCalculation, groupPrefix = '' }: IMemoryCacheOptions) {
    super({ maxSize, length, groupPrefix });
    // At least one of 'max', 'ttl', or 'maxSize' is required, to prevent
    // unsafe unbounded storage.
    //
    // In most cases, it's best to specify a max for performance, so all
    // the required memory allocation is done up-front.
    this.client = new LRUCache({
      maxSize: maxSize,
      sizeCalculation: length,
      ttl: 1000 * 60 * 5,
      allowStale: false,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });
  }

  public set(key: string, value: string, options?: { ttl?: number }): Promise<void> {
    const maxAge = options && options.ttl && options.ttl * 1000;
    if (isJSON(value)) {
      this.client.set(this.addKeyPrefix(key), JSON.parse(value), { ttl: maxAge || 3600 });
    } else {
      this.client.set(this.addKeyPrefix(key), value, { ttl: maxAge || 3600 });
    }
    return Promise.resolve();
  }

  public get(key: string): Promise<string | undefined> {
    const data = this.client.get(this.addKeyPrefix(key));
    if (isObjectLike(data)) {
      return Promise.resolve(JSON.stringify(data));
    }
    return Promise.resolve(data);
  }

  public delete(key: string): Promise<boolean> {
    this.client.delete(this.addKeyPrefix(key));
    return Promise.resolve(true);
  }

  // removes all keys using the keyPrefix which should equal to the group
  public expireGroup(groupName?: string): Promise<void> {
    const expireGroup = this.groupPrefix || groupName;
    // console.log('expire group', expireGroup);
    if (expireGroup) {
      const groupRegexp = new RegExp(`^${expireGroup}`);
      Array.from(this.client.keys()).forEach((key: string) => {
        if (groupRegexp.test(key)) {
          // console.log('deleting', key);
          this.client.delete(key);
        }
      });
    }
    return Promise.resolve();
  }

  public flush(): Promise<void> {
    this.client.clear();
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
