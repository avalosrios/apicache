import {
    NextFunction,
    Request,
    Response,
    Send,
} from 'express';
import {
    IMiddlewareOptions, IMiddlewareResponse,
    IMiddlewareToggle,
    ITimeMap,
    ITransformDuration,
} from './common/types';
import { RedisCache } from './RedisCache';
import { ServerCache } from './ServerCache';

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
        this.options = localOptions;
        // TODO default to a in memory cache
        // this.serverCache = null;
        this.serverCache = new RedisCache(this.options && this.options.redisOptions);
        this.middlewareToggle = middlewareToggle;
    }

    public cache = async (req: Request, res: Response, next: NextFunction): Promise<void|Response> => {
        if (!this.options.enabled) {
            return next();
        }
        let key = req.originalUrl || req.url;

        if (this.options.appendKey) {
            key += '$$appendKey=' + this.options.appendKey(req, res);
        }
        const cached = await this.serverCache.get(key);
        if (cached) {
            return this.sendCachedResponse(req, res, next, cached);
        }
        return this.cacheResponse(req, res, next, key);
    };

    private cacheResponse = (
        req: Request,
        res: IMiddlewareResponse,
        next: NextFunction,
        key: string,
    ) => {
        res._middlewareApi = {
            cachable: true,
            content: undefined,
            headers: res.getHeaders(),
            send: res.send,
            write: res.write,
            writeHead: res.writeHead,
        };

        res.send = (body: any): Response => {
            // if (res._middlewareApi.cachable && res._middlewareApi.content) {
            //     this.serverCache.set(key, body, { ttl: this.duration });
            // }
            this.serverCache.set(key, JSON.stringify(body), { ttl: this.duration });
            if (res._middlewareApi) {
                return res._middlewareApi.send(body);
            }
            return res.send(body);
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
        // const headers = res.getHeaders();
        // res.writeHead(200, headers);
        return res.send(cachedResponse);
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
