export abstract class ServerCache<V = string> {
    public cacheOptions: any;
    constructor(options: any) {
        this.cacheOptions = options;
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

    public abstract flush(): Promise<void>;

    public abstract close(): Promise<void>;
}
