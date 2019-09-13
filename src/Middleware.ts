import {
    NextFunction,
    Request,
    Response,
} from 'express';
import {
    IMiddlewareOptions, IMiddlewareResponse,
    IMiddlewareToggle,
    ITimeMap,
    ITransformDuration,
} from './common/types';
import { RedisCache } from './RedisCache';
import { MemoryCache } from './MemoryCache';
import { ServerCache } from './ServerCache';
import  moment from 'moment';

export type MiddlewareCache = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

export class Middleware {
    public serverCache: ServerCache;
    public duration: number;
    public middlewareToggle: IMiddlewareToggle | undefined;
    public options: any;
    private DEFAULT_DURATION: number = 3600;
    private TIME_MAP: ITimeMap = {
        second:       1,
        // tslint:disable-next-line:object-literal-sort-keys
        minute:       60,
        hour:         3600,
        day:          3600 * 24,
        week:         3600 * 24 * 7,
        month:        3600 * 24 * 30,
    };

    constructor(
        duration: string,
        middlewareToggle?: IMiddlewareToggle,
        localOptions?: IMiddlewareOptions,
    ) {
        this.duration = this.getDuration(duration);
        const defaultOptions: IMiddlewareOptions = {
            debug: false,
            defaultDuration: 3600,
            enabled: true,
        };
        this.options = Object.assign({}, localOptions, defaultOptions);

        this.serverCache = new MemoryCache({});
        if (this.options && this.options.redisOptions ) {
            this.serverCache = new RedisCache(this.options.redisOptions);
        }
        this.middlewareToggle = middlewareToggle;
    }

    public cache: MiddlewareCache = async (req: Request, res: Response, next: NextFunction) => {
        if (!this.options.enabled) {
            console.log('cache not enabled', this.options);
            return next();
        }
        let key = req.originalUrl || req.url;

        if (this.options.appendKey) {
            key += '$$appendKey=' + this.options.appendKey(req, res);
        }
        const cached = await this.serverCache.get(key);
        if (cached) {
            console.log('response is cached', cached);
            return this.sendCachedResponse(req, res, next, cached);
        }
        console.log('caching response ... ', cached);
        return this.cacheResponse(req, res, next, key);
    };

    private cacheResponse = (
        req: Request,
        res: IMiddlewareResponse,
        next: NextFunction,
        key: string,
    ) => {
        res.append('cache-control', 'max-age=' + (this.duration).toFixed(0));
        res._apiSend = res.send;

        res.send = (body: any): Response => {
            // if (res._middlewareApi.cachable && res._middlewareApi.content) {
            //     this.serverCache.set(key, body, { ttl: this.duration });
            // }
            const cacheObj = {
                timestamp: moment.utc().toISOString(),
                data: JSON.parse(body)
            };
            this.serverCache.set(key, JSON.stringify(cacheObj), { ttl: this.duration });
            return res._apiSend(body);

            // return res.send(body);
        };
        return next();
    };

    private sendCachedResponse = (
        req: Request,
        res: Response,
        next: NextFunction,
        cachedResponse: string,
    ) => {
        if (this.middlewareToggle && !this.middlewareToggle(req, res)) {
            return next();
        }
        const headers = res.getHeaders();
        console.log('headers', headers);
        console.log('cachedResponse', typeof cachedResponse, cachedResponse);
        const { data, timestamp } = Object.assign({}, JSON.parse(cachedResponse) );
        // calculate the expiration header
        const maxAge = Math.max(this.duration - moment.utc().diff(moment.utc(timestamp), 'seconds'), 0 );
        res.append('cache-control', 'max-age=' + (maxAge).toFixed(0));
        return res.status(200).send(data);
    };

    private getDuration: ITransformDuration = (durationStr: string) => {
        if (/\d+$/.test(durationStr)) {
            return +durationStr;
        }
        const split = durationStr.match(/^([\d.,]+)\s?(\w+)$/);
        if (split && split.length === 3) {
            const len = parseFloat(split[1]);
            let unit = split[2].replace(/s$/i, '').toLowerCase();
            if (unit === 'm') {
                unit = 'ms';
            }
            return (len || 1) * (this.TIME_MAP[unit] || 0 );
        }
        return this.DEFAULT_DURATION;
    };
}
