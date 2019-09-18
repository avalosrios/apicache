export abstract class ServerCache<V = string> {
    public cacheOptions: any;
    public groupPrefix: string;
    constructor(options: any = {}) {
        this.cacheOptions = options;
        this.groupPrefix = options.groupPrefix || '';
    }
    public abstract set(
        key: string,
        value: string,
        options?: { ttl?: number },
    ): Promise<void>;

    public abstract get(
        key: string,
    ): Promise<V|undefined>;

    public abstract delete(
        key: string,
    ): Promise<boolean>;

    // removes all keys using the options.keyPrefix
    public abstract expireGroup(groupName?: string): Promise<void>;

    public abstract flush(): Promise<void>;

    public abstract close(): Promise<void>;

    protected addKeyPrefix(key:string): string {
        return `${this.groupPrefix}${key}`;
    }
}
