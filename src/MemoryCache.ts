import LRUCache from 'lru-cache';
import { ServerCache } from './ServerCache';
import { isObjectLike } from 'lodash';

export interface MemoryCacheOptions {
    maxSize?: number;
    length?: (value: any, key: string) => number;
}

function defaultLengthCalculation(item: any) {
    if (Array.isArray(item) || typeof item === 'string') {
        return item.length;
    }
    return 1;
}

function isJSON(str:string): boolean {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export class MemoryCache extends ServerCache<string> {
    public readonly client: LRUCache<string, any>;

    constructor({ maxSize = Infinity, length = defaultLengthCalculation }: MemoryCacheOptions) {
        super({ maxSize, length });
        this.client = new LRUCache({
            max: maxSize,
            length
        });
    }

    set(
        key: string,
        value: string,
        options?: { ttl?: number }
    ): Promise<void> {
        const maxAge = options && options.ttl && options.ttl * 1000;
        if (isJSON(value)) {
            this.client.set(key, JSON.parse(value), maxAge || 3600);
        } else {
            this.client.set(key, value, maxAge || 3600);
        }
        return Promise.resolve();
    }

    get(key: string): Promise<string | undefined> {
        const data = this.client.get(key);
        if (isObjectLike(data)) {
            return Promise.resolve(JSON.stringify(data));
        }
        return Promise.resolve(data);
    }

    delete(key: string): Promise<boolean> {
        this.client.del(key);
        return Promise.resolve(true);
    }

    flush(): Promise<void> {
        this.client.reset();
        return Promise.resolve();
    }

    close(): Promise<void> {
        return Promise.resolve();
    }
}
