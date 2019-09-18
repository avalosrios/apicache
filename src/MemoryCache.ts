import LRUCache from 'lru-cache';
import { ServerCache } from './ServerCache';
import { isObjectLike } from 'lodash';

export interface MemoryCacheOptions {
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

    constructor({ maxSize = Infinity, length = defaultLengthCalculation, groupPrefix = '' }: MemoryCacheOptions) {
        super({ maxSize, length, groupPrefix });
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
            this.client.set(this.addKeyPrefix(key), JSON.parse(value), maxAge || 3600);
        } else {
            this.client.set(this.addKeyPrefix(key), value, maxAge || 3600);
        }
        return Promise.resolve();
    }

    get(key: string): Promise<string | undefined> {
        const data = this.client.get(this.addKeyPrefix(key));
        if (isObjectLike(data)) {
            return Promise.resolve(JSON.stringify(data));
        }
        return Promise.resolve(data);
    }

    delete(key: string): Promise<boolean> {
        this.client.del(this.addKeyPrefix(key));
        return Promise.resolve(true);
    }

    // removes all keys using the keyPrefix which should equal to the group
    expireGroup(groupName?: string): Promise<void> {
        const expireGroup = this.groupPrefix || groupName;
        console.log('expire group', expireGroup);
        if (expireGroup) {
            const groupRegexp = new RegExp(`^${expireGroup}`);
            this.client.keys().forEach( (key:string) => {
                if (groupRegexp.test(key)) {
                    console.log('deleting', key);
                    this.client.del(key);
                }
            });
        }
        return Promise.resolve();
    }

    flush(): Promise<void> {
        this.client.reset();
        return Promise.resolve();
    }

    close(): Promise<void> {
        return Promise.resolve();
    }
}
