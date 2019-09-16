import zenrezApiCache from '../index';
import express, { Request, Response } from 'express';
import request from 'supertest';
import MockDate from 'mockdate';
import moment, { Moment } from 'moment';
import { MiddlewareApiCache} from '../common/types';
import { MemoryCache } from '../MemoryCache';
import { RedisCache } from '../RedisCache';

describe('express integration', () => {
    let app: any;
    let apiCache: MiddlewareApiCache;
    let memSpy: any;
    let redisSpy: any;
    let now: Moment;
    beforeEach( () => {
        apiCache = zenrezApiCache;
        jest.useFakeTimers();
        memSpy = jest.spyOn(MemoryCache.prototype, 'set');
        redisSpy = jest.spyOn(RedisCache.prototype, 'set');
        now = moment.utc();
        MockDate.set(now.toDate());
    });
    afterEach( () => {
        jest.clearAllMocks();
        MockDate.reset();
    });
    describe('GET methods', () => {
        describe('default options', () => {
            beforeEach( () => {
                app = express();
                app.get('/api/collection/:id', apiCache('10 seconds'), (req: Request, res: Response) => {
                    res.json({ foo: 'bar' });
                });
            });
            it('caches a route', () => {
                return request(app).get('/api/collection/1')
                    .expect(200, { foo: 'bar' })
                    .expect('Cache-Control', /max-age/);
            });
            it('returns a decremented max-age header', () => {
                return request(app).get('/api/collection/1')
                    .expect(200, { foo: 'bar' })
                    .expect('Cache-Control', 'max-age=10')
                    .then( () => {
                        MockDate.set(now.add(1, 'second').toDate());
                        return request(app)
                            .get('/api/collection/1')
                            .expect(200, { foo: 'bar' })
                            .expect('Cache-Control', 'max-age=9');
                    })
            });
        });
        describe('options', () => {
            describe('enabled', () => {
                beforeEach( () => {
                    app = express();
                    app.get('/api/collection/1',
                        apiCache('10 seconds', { enabled: false }),
                        (req: Request, res: Response) => res.json({ foo: 'bar' })
                    );
                });
                it('skips caching when not enabled', () => {
                    return request(app).get('/api/collection/1')
                        .expect(200, { foo: 'bar' })
                        .expect((res) => {
                            if (res.header['cache-control']) throw new Error('cache-control header found');
                        })
                        .then( () => {
                            expect(memSpy).not.toHaveBeenCalled();
                        });
                })
            });
            describe('appendKey', () => {
                beforeEach( () => {
                    app = express();
                    app.get('/api/collection/:id',
                        apiCache('10 seconds', {
                            appendKey: (req: Request, res: Response) => {
                              return req.method + 'myKey';
                            },
                        }),
                        (req: Request, res: Response) => res.json({ foo: 'bar' })
                    );
                });
                it('appends a string to the key', () => {
                    return request(app).get('/api/collection/1')
                        .expect(200, { foo: 'bar' })
                        .expect('Cache-Control', /max-age/)
                        .then( () => {
                            expect(memSpy).toHaveBeenCalledWith(
                                '/api/collection/1$$appendKey=GETmyKey',
                                JSON.stringify({
                                    timestamp: now.toISOString(),
                                    data: { foo: 'bar' },
                                }),
                                { ttl: 10},
                            );
                        });
                });
            });
            describe('statusCodes', () => {
                describe('include', () => {
                    beforeEach( () => {
                        app = express();
                        app.get('/api/collection/:id',
                            apiCache('10 seconds', {
                                statusCodes: {
                                    include: [400]
                                }
                            }),
                            (req: Request, res: Response) => res.status(400).json({ foo: 'bar' })
                        );
                    });
                    it('caches a request when the status code is in the inclusion list', () => {
                        return request(app).get('/api/collection/1')
                            .expect(400, { foo: 'bar' })
                            .expect('Cache-Control', 'max-age=10')
                            .then( () => {
                                expect(memSpy).toHaveBeenCalled();
                            });
                    });
                    it('does not caches the response when not included', () => {
                        return request(app).get('/api/missing/')
                            .expect(404)
                            .expect((res) => {
                                if (res.header['cache-control']) throw new Error('cache-control header found');
                            })
                            .then( () => {
                                expect(memSpy).not.toHaveBeenCalled();
                            });
                    });
                });
                describe('exclude', () => {
                    beforeEach( () => {
                        app = express();
                        app.get('/api/collection/:id',
                            apiCache('10 seconds', {
                                statusCodes: {
                                    exclude: [201]
                                }
                            }),
                            (req: Request, res: Response) => res.status(201).json({ foo: 'bar' })
                        );
                    });
                    it('does not caches a request when the status code is in status exclusion list', () => {
                        return request(app).get('/api/collection/1')
                            .expect(201, { foo: 'bar' })
                            .expect((res) => {
                                if (res.header['cache-control']) throw new Error('cache-control header found');
                            })
                            .then( () => {
                                expect(memSpy).not.toHaveBeenCalled();
                            });
                    })
                });
            });
            describe('middlewareToggle', () => {
                let toggle: any ;
                let toggleSpy: any;
                beforeEach( () => {
                    app = express();
                    toggle = {
                        fn: (req: Request, res: Response) => {
                            return req.method === 'GET';
                        }
                    };
                    toggleSpy = jest.spyOn(toggle, 'fn');
                    app.get('/api/collection/:id',
                        apiCache('10 seconds', {
                            middlewareToggle: toggle.fn,
                        }),
                        (req: Request, res: Response) => res.status(200).json({ foo: 'bar' })
                    );
                    app.post('/api/collection/',
                        apiCache('10 seconds', {
                            middlewareToggle: toggle.fn,
                        }),
                        (req: Request, res: Response) => res.status(200).json({ foo: 'bar' })
                    );
                });
                it('it determines if the response should be cached', () => {
                    return request(app).get('/api/collection/1')
                        .expect(200, { foo: 'bar' })
                        .expect('Cache-Control', 'max-age=10')
                        .then( () => {
                            expect(toggleSpy).toHaveBeenCalled();
                            expect(memSpy).toHaveBeenCalled();
                        });
                });
                it('does not caches the response when it evaluates to false', () => {
                    return request(app).post('/api/collection/')
                        .expect(200, { foo: 'bar' })
                        .expect((res) => {
                            if (res.header['cache-control']) throw new Error('cache-control header found');
                        })
                        .then( () => {
                            expect(toggleSpy).toHaveBeenCalled();
                            expect(memSpy).not.toHaveBeenCalled();
                        });
                });
            });
            describe('redisOptions', () => {
                beforeEach( () => {
                    app = express();
                    app.get('/api/collection/:id',
                        apiCache(
                            '5 seconds',
                            {
                                redisOptions: {
                                    port: 6379, // Redis port
                                    host: "localhost", // Redis host
                                }
                            }
                        ),
                        (req: Request, res: Response) => {
                            res.json({ foo: 'bar' });
                        }
                    );
                });
                it('caches a route', () => {
                    return request(app).get('/api/collection/1')
                        .expect(200, { foo: 'bar' })
                        .expect('Cache-Control', /max-age/)
                        .then( () => {
                            expect(redisSpy).toHaveBeenCalled();
                        });
                });
                it('returns a decremented max-age header', () => {
                    return request(app).get('/api/collection/1')
                        .expect(200, { foo: 'bar' })
                        .expect('Cache-Control', 'max-age=5')
                        .then( () => {
                            MockDate.set(now.add(1, 'seconds').toDate());
                            return request(app)
                                .get('/api/collection/1')
                                .expect(200, { foo: 'bar' })
                                .expect('Cache-Control', 'max-age=4');
                        });
                });
            });
            describe.skip('grouping', () => {

            });
        });
    });
});
