import zenrezApiCache from '../index';
import express, {Request, Response} from 'express';
import { MiddlewareCache } from '../Middleware';
import request from 'supertest';
import MockDate from 'mockdate';
import moment from 'moment';

describe('express integration', () => {
    let app: any;
    let apiCache: (duration?: string) => MiddlewareCache;
    beforeEach( () => {
        app = express();
        apiCache = zenrezApiCache;
        jest.useFakeTimers();
    });
    afterEach( () => {
        MockDate.reset();
    });
    describe('GET methods', () => {
        beforeEach( () => {
            app.get('/api/collection/:id', apiCache('10 seconds'), (req: Request, res: Response) => {
                res.json({ foo: 'bar' });
            });
        });
        it('caches a route', () => {
            return request(app).get('/api/collection/:id')
                .expect(200, { foo: 'bar' })
                .expect('Cache-Control', /max-age/);
        });
        it('returns a decremented max-age header', () => {
            let now = moment.utc();
            MockDate.set(now.subtract(1, 'second').toDate());
            return request(app).get('/api/collection/:id')
                .expect(200, { foo: 'bar' })
                .expect('Cache-Control', 'max-age=10')
                .then( () => {
                    MockDate.set(now.add(1, 'second').toDate());
                    return request(app)
                        .get('/api/collection/:id')
                        .expect(200, { foo: 'bar' })
                        .expect('Cache-Control', 'max-age=9');
                })
        });
    });
});
