import DataLoader from 'dataloader';
import Redis, { RedisOptions } from 'ioredis';
import { ServerCache } from './ServerCache';

export interface RedisCacheOptions extends RedisOptions {
    groupPrefix?: string;
}

export class RedisCache extends ServerCache<string> {
    public readonly client: any;
    public readonly defaultOptions = {
        ttl: 3600,
    };

    private loader: DataLoader<string, string>;

    constructor(options?: RedisCacheOptions) {
        super(options);
        this.client = new Redis(this.cacheOptions);
        this.loader = new DataLoader( async (keys) => {
            const response = await this.client.mget(keys);
            return response ? response : keys.map( () => null);
        }, {
            cache: false,
        });
    }

    public async set(
        key: string,
        value: string,
        options?: { ttl?: number },
    ): Promise<void> {
        const { ttl } = Object.assign({}, this.defaultOptions, options);
        await this.client.set(this.addKeyPrefix(key), value, 'EX', ttl);
        return;
    }

    public async get(key: string): Promise<string|undefined> {
        const reply = await this.loader.load(this.addKeyPrefix(key));
        if (reply !== null) {
            return reply;
        }
        return;
    }

    // removes all keys using the keyPrefix which should equal to the group
    public expireGroup(groupName?:string): Promise<void> {
        const keyPrefix = this.groupPrefix || groupName;
        if (keyPrefix) {
            return new Promise((resolve, reject) => {
                const stream = this.client.scanStream({
                    match: `${keyPrefix}*`,
                    count: 100
                });
                const pipeline = this.client.pipeline();
                stream.on('data', (resultKeys:string[]) => {
                    resultKeys.forEach( (key:string) => {
                        // remove prefix from key
                        pipeline.del(key);
                    });
                    pipeline.exec();
                });
                stream.on('end', () => resolve());
                stream.on('error', (err: Error) => reject(err.message));
            });
        }
        return Promise.resolve();
    }

    public async delete(key: string): Promise<boolean> {
        return await this.client.del(this.addKeyPrefix(key));
    }

    public async flush(): Promise<void> {
        await this.client.flushdb();
    }

    public async close(): Promise<void> {
        await this.client.quit();
        return;
    }
}
