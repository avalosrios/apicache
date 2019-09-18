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
import MemoryCacheClient from './MemoryCacheClient';
import { ServerCache } from './ServerCache';
import  moment from 'moment';

export type MiddlewareCache = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

export class Middleware {
    public serverCache: ServerCache;
    public duration: number;
    public middlewareToggle: IMiddlewareToggle | undefined;
    public options: IMiddlewareOptions;
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
        options?: IMiddlewareOptions
    ) {
        this.duration = this.getDuration(duration);
        const defaultOptions: IMiddlewareOptions = {
            debug: false,
            defaultDuration: 3600,
            enabled: true,
        };
        this.options = Object.assign({}, defaultOptions, options);

        this.serverCache = MemoryCacheClient;
        this.serverCache.groupPrefix = this.options.collectionGroup || '';
        if (this.options && this.options.redisOptions ) {
            this.serverCache = new RedisCache({
                ... this.options.redisOptions,
                ... this.options.collectionGroup && { groupPrefix: this.options.collectionGroup }
            });
        }
        this.middlewareToggle = options && options.middlewareToggle;
    }

    public cache: MiddlewareCache = async (req: Request, res: Response, next: NextFunction) => {
        console.log('enabled?', this.options.enabled);
        if (!this.options.enabled) {
            return next();
        }
        let key = req.originalUrl || req.url;

        if (this.options.appendKey) {
            key += '$$appendKey=' + this.options.appendKey(req, res);
        }
        if (this.expireCacheGroups(this.options)) {
            const groupNames = this.options.expireCollections || [this.serverCache.groupPrefix];
            await Promise.all(
                groupNames.map((groupName:string) => this.serverCache.expireGroup(groupName))
            );
            return next();
        }
        const cached = await this.serverCache.get(key);
        if (cached) {
            console.log('response is cached', cached);
            return this.sendCachedResponse(req, res, next, cached);
        }
        console.log('caching response ... ', cached);
        return this.cacheResponse(req, res, next, key);
    };

    private includeStatusCode = (statuses: Number[], statusNo: Number):boolean => statuses.some( e => e === statusNo);

    private expireCacheGroups = (cacheOptions: IMiddlewareOptions): boolean => {
        if (cacheOptions.expireCollections) {
            return cacheOptions.expireCollections.length > 0;
        }
        return false;
    };

    private shouldCacheSendRequest = (req: Request, res: Response): boolean => {
        const { statusCodes, middlewareToggle } = this.options;
        if (middlewareToggle) {
            return middlewareToggle(req, res);
        }
        if (statusCodes) {
            if (statusCodes.exclude) {
                return !this.includeStatusCode(statusCodes.exclude, res.statusCode);
            }
            if (statusCodes.include) {
                return this.includeStatusCode(statusCodes.include, res.statusCode);
            }
        }
        return true;
    };

    private cacheResponse = (
        req: Request,
        res: IMiddlewareResponse,
        next: NextFunction,
        key: string,
    ) => {
        res._apiSend = res.send;
        res.send = (body: any): Response => {
            // if (res._middlewareApi.cachable && res._middlewareApi.content) {
            //     this.serverCache.set(key, body, { ttl: this.duration });
            // }
            if (this.shouldCacheSendRequest(req, res)) {
                res.append('cache-control', 'max-age=' + (this.duration).toFixed(0));
                const cacheObj = {
                    timestamp: moment.utc().toISOString(),
                    data: JSON.parse(body)
                };
                this.serverCache.set(key, JSON.stringify(cacheObj), { ttl: this.duration });
            }
            return res._apiSend(body);
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
