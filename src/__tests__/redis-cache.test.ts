import { RedisCache } from '../RedisCache';
import Redis from 'ioredis';

let cache: RedisCache;
beforeEach( () => {
    cache = new RedisCache();
    jest.spyOn(Redis.prototype, 'set');
    jest.spyOn(Redis.prototype, 'mget');
    jest.spyOn(Redis.prototype, 'del');
    jest.spyOn(Redis.prototype, 'flushdb');
    jest.spyOn(Redis.prototype, 'quit');
});

afterEach( async () => {
    jest.clearAllMocks();
});

describe('RedisCache', () => {
    describe('.set', () => {
        it('sets a key with default duration', async () => {
            await cache.set('mykey', 'myvalue');
            expect(Redis.prototype.set).toHaveBeenCalledWith(
                'mykey',
                'myvalue',
                'EX',
                3600
            );
        });
        it('sets a key with a custom ttl', async () => {
            await cache.set('mykey', 'myvalue', { ttl: 1000 });
            expect(Redis.prototype.set).toHaveBeenCalledWith(
                'mykey',
                'myvalue',
                'EX',
                1000
            );
        });
        describe('with prefixes', () => {
            beforeEach(async () => {
                cache = new RedisCache({ keyPrefix: 'test:' });
            });
            it('sets a key using the prefix', async () => {
                await cache.set('mykey', 'myvalue');
                expect(Redis.prototype.set).toHaveBeenCalledWith(
                    'mykey',
                    'myvalue',
                    'EX',
                    3600
                );
                const redisClient = new Redis();
                const allKeys = await redisClient.keys('*');
                expect(allKeys).toContain('test:mykey');
                await redisClient.del('test:mykey');
            });
        });
    });

    describe('.get', () => {
        beforeEach( () => {
            return cache.set('mykey', 'myvalue');
        });
        it('gets a saved key', async () => {
            const res = await cache.get('mykey');
            expect(res).toBe('myvalue');
            expect(Redis.prototype.mget).toHaveBeenCalledWith(['mykey']);
        });
        it('returns undefined when no key is found', async () => {
            const res = await cache.get('dont exist');
            expect(res).toBe(undefined);
        });
        describe('with prefix', () => {
            beforeEach( async () => {
                cache = new RedisCache({ keyPrefix: 'test:' });
                await cache.set('mykey1', 'myvalue');
            });
            afterEach( async () => {
                await cache.delete('mykey1');
            });
            it('gets a key using a prefix', async () => {
                const res = await cache.get('mykey1');
                expect(res).toBe('myvalue');
                expect(Redis.prototype.mget).toHaveBeenCalledWith(['mykey1']);
            });
        })
    });

    describe('.delete', () => {
        beforeEach( () => {
            return cache.set('mykey', 'myvalue');
        });
        it('removes a key', async () => {
            await cache.delete('mykey');
            expect(Redis.prototype.del).toHaveBeenCalledWith('mykey');
            const val = await cache.get('mykey');
            expect(val).toBe(undefined);
        });
    });

    describe('.flush', () => {
        it('flushes the cache', async () => {
            await cache.flush();
            expect(Redis.prototype.flushdb).toHaveBeenCalled();
        });
    });

    describe('.close', () => {
        it('closes the client connection', async () => {
            const res = await cache.close();
            expect(res).toBe(undefined);
            expect(Redis.prototype.quit).toHaveBeenCalled();
        });
    });
});
