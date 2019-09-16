import DataLoader from 'dataloader';
import Redis, { RedisOptions } from 'ioredis';
import { ServerCache } from './ServerCache';

export class RedisCache extends ServerCache<string> {
    public readonly client: any;
    public readonly defaultOptions = {
        ttl: 3600,
    };

    private loader: DataLoader<string, string>;

    constructor(options?: RedisOptions) {
        super(options);
        this.client = new Redis(this.cacheOptions);
        // TODO add another loader that allows grouping requests
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
        await this.client.set(key, value, 'EX', ttl);
        return;
    }

    public async get(key: string): Promise<string|undefined> {
        const reply = await this.loader.load(key);
        if (reply !== null) {
            return reply;
        }
        return;
    }

    public async delete(key: string): Promise<boolean> {
        return await this.client.del(key);
    }

    public async flush(): Promise<void> {
        await this.client.flushdb();
    }

    public async close(): Promise<void> {
        await this.client.quit();
        return;
    }
}
