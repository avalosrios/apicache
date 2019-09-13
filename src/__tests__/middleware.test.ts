import { ServerCache } from '../ServerCache';
import { Middleware } from '../Middleware';

describe('Middleware', () => {

    describe('constructor', () => {
        describe('parses human readable duration', () => {
            it('parses days to s', () => {
                const middleware = new Middleware('1 day');
                expect(middleware.duration).toBe(24*60*60);
            });
            it('parses hours to s', () => {
                const middleware = new Middleware('1 hour');
                expect(middleware.duration).toBe(60*60);
            });
            it('parses minutes to s', () => {
                const middleware = new Middleware('1 minute');
                expect(middleware.duration).toBe(60);
            });
            it('parses seconds to s', () => {
                const middleware = new Middleware('1 second');
                expect(middleware.duration).toBe(1);
            });
            it('transforms a numeric string and sets is as s duration', () => {
                const middleware = new Middleware('1000');
                expect(middleware.duration).toBe(1000);
            });
        });
        it('initializes a server cache',  () => {
            const middleware = new Middleware('1 hour');
            expect(middleware.serverCache).toBeInstanceOf(ServerCache);
        });
    });
});
