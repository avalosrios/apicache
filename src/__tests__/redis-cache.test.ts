jest.mock('ioredis');
import { RedisCache } from '../RedisCache';

let cache: RedisCache;
beforeEach( () => {
    cache = new RedisCache();
});

describe('RedisCache', () => {
    describe('.set', () => {
        it('sets a key with default duration', async () => {
            await cache.set('mykey', 'myvalue');
            expect(cache.client.set).toHaveBeenCalledWith(
                'mykey',
                'myvalue',
                'EX',
                3600
            );
        });
        it('sets a key with a custom ttl', async () => {
            await cache.set('mykey', 'myvalue', { ttl: 1000 });
            expect(cache.client.set).toHaveBeenCalledWith(
                'mykey',
                'myvalue',
                'EX',
                1000
            );
        });
    });

    describe('.get', () => {
        beforeEach( () => {
            return cache.set('mykey', 'myvalue');
        });
        it('gets a saved key', async () => {
            const res = await cache.get('mykey');
            expect(res).toBe('myvalue');
            expect(cache.client.mget).toHaveBeenCalledWith(['mykey']);
        });
        it('returns undefined when no key is found', async () => {
            const res = await cache.get('dont exist');
            expect(res).toBe(undefined);
        });
    });

    describe('.delete', () => {
        beforeEach( () => {
            return cache.set('mykey', 'myvalue');
        });
        it('removes a key', async () => {
            await cache.delete('mykey');
            expect(cache.client.del).toHaveBeenCalledWith('mykey');
            const val = await cache.get('mykey');
            expect(val).toBe(undefined);
        });
    });

    describe('.flush', () => {
        it('flushes the cache', async () => {
            await cache.flush();
            expect(cache.client.flushdb).toHaveBeenCalled();
        });
    });

    describe('.close', () => {
        it('closes the client connection', async () => {
            const res = await cache.close();
            expect(res).toBe(undefined);
            expect(cache.client.quit).toHaveBeenCalled();
        });
    });
});
