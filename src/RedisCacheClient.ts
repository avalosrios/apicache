import { RedisCache } from './RedisCache';

export class RedisCacheClient {
  private static instance: RedisCache | undefined;
  private cacheOptions: any;
  constructor(options: any) {
    this.cacheOptions = options;
  }

  public getClient = (): RedisCache => {
    if (!RedisCacheClient.instance) {
      RedisCacheClient.instance = new RedisCache(this.cacheOptions);
    }
    return RedisCacheClient.instance;
  };
}
