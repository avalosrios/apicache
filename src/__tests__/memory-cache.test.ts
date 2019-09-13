import { MemoryCache } from '../MemoryCache';

describe('MemoryCache', () => {
    let cache: MemoryCache;
    beforeEach( () => {
        cache = new MemoryCache({});
    });
    describe('set and get', () => {
        it('can store and retrieve the same key', async () => {
            await cache.set('mykey', 'myvalue');
            const value = await cache.get('mykey');
            expect(value).toBe('myvalue');
        });
    });
    describe('set and delete', () => {
        it('can set and delete the same key', async () => {
            await cache.set('mykey', 'myvalue');
            await cache.delete('mykey');
            const value = await cache.get('mykey');
            expect(value).toBe(undefined);
        });
    });
});
