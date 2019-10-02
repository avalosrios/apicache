import { RedisCache } from '../RedisCache';
import { RedisCacheClient } from '../RedisCacheClient';

describe('RedisCacheClient', () => {
  it('initializes a Redis cache', () => {
    const cacheClient = new RedisCacheClient({});
    expect(cacheClient.getClient()).toBeInstanceOf(RedisCache);
  });
  it('reuses the redis cache when calling getClient using a new instance', () => {
    const cacheClient = new RedisCacheClient({});
    expect(cacheClient.getClient()).toBeInstanceOf(RedisCache);
    const anotherCacheClient = new RedisCacheClient({});
    expect(anotherCacheClient.getClient()).toBe(cacheClient.getClient());
  });
});
