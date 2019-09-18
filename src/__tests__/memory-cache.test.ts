import { MemoryCache } from '../MemoryCache';
import LRUCache from 'lru-cache';

describe('MemoryCache', () => {
    let cache: MemoryCache;
    beforeEach( () => {
        jest.spyOn(LRUCache.prototype, 'set');
        jest.spyOn(LRUCache.prototype, 'get');
        jest.spyOn(LRUCache.prototype, 'del');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('set and get', () => {
        beforeEach( () => {
            cache = new MemoryCache({});
        });
        it('can store and retrieve the same key', async () => {
            await cache.set('mykey', 'myvalue');
            const value = await cache.get('mykey');
            expect(value).toBe('myvalue');
        });
    });
    describe('set and delete', () => {
        beforeEach( () => {
            cache = new MemoryCache({});
        });
        it('can set and delete the same key', async () => {
            await cache.set('mykey', 'myvalue');
            await cache.delete('mykey');
            const value = await cache.get('mykey');
            expect(value).toBe(undefined);
        });
    });
    describe('with key prefix', () => {
        beforeEach( () => {
            cache = new MemoryCache({ groupPrefix: 'test:' });
        });
        it('can set and get', async () => {
            await cache.set('mykey', 'myvalue');
            const value = await cache.get('mykey');
            expect(value).toBe('myvalue');
            expect(LRUCache.prototype.set).toHaveBeenCalledWith('test:mykey', 'myvalue', 3600);
            expect(LRUCache.prototype.get).toHaveBeenCalledWith('test:mykey');
        });
        it('can set and delete the same key', async () => {
            await cache.set('mykey', 'myvalue');
            await cache.delete('mykey');
            const value = await cache.get('mykey');
            expect(value).toBe(undefined);
            expect(LRUCache.prototype.set).toHaveBeenCalledWith('test:mykey', 'myvalue', 3600);
            expect(LRUCache.prototype.del).toHaveBeenCalledWith('test:mykey');
        });
    });
    describe('expiring a group prefix', () => {
        it('does not remove any key if no prefix is set', async () => {
            cache =  new MemoryCache({});
            await cache.set('dontDeleteMe', 'myvalue');
            await cache.expireGroup();
            const value = await cache.get('dontDeleteMe');
            expect(value).toBe('myvalue');
        });
        describe('with a key prefix', () => {
            beforeEach( async () => {
                cache = new MemoryCache({ groupPrefix: 'group:' });
            });
            it('removes all keys with prefix', async () => {
                await cache.set('deleteMe1', 'myvalue');
                await cache.set('deleteMe2', 'myvalue');
                await cache.expireGroup();
                const value = await cache.get('deleteMe1');
                expect(value).toBeFalsy();
            });
        });
    });
});
