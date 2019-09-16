import { Request, Response, Send } from 'express';
import {OutgoingHttpHeaders} from 'http';
import { RedisOptions } from 'ioredis';
import {MiddlewareCache} from "../Middleware";

export interface IStatusCodes {
    include?: Number[];
    exclude?: Number[];
}
export interface IMiddlewareOptions {
    debug?: boolean;
    defaultDuration?: number;
    enabled?: boolean;
    statusCodes?: IStatusCodes;
    redisOptions?: RedisOptions;
    headers?: any;
    appendKey?: (req: Request, res: Response) => string;
    middlewareToggle?: IMiddlewareToggle;
    collectionGroup?: string;
    expireCollections?: (groupNames: string[]) => void;
}

export interface IMiddlewareResponse extends Response {
    _apiSend?: any;
}

// TODO remove this
export interface ICacheOptions {
    enabled: boolean;
    appendKey?: (req: Request, res: Response) => string;
}

interface IDictionary<T> {
    [key: string]: T;
}

export interface ITimeMap extends IDictionary<number> {
    // ms: number;
    second: number;
    minute: number;
    hour: number;
    day: number;
    week: number;
    month: number;
}

export type IMiddlewareToggle = (req: any, res: any) => boolean;

export type ITransformDuration = (durationStr: string) => number;

export type MiddlewareApiCache = (duration?: string, options?: IMiddlewareOptions) => MiddlewareCache;
