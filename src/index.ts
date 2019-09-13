import { Middleware } from './Middleware';
import { IMiddlewareOptions } from './common/types';
const DEFAULT_DURATION = '1 hour';
export = ( duration?: string, options?: IMiddlewareOptions ) => new Middleware(duration || DEFAULT_DURATION, options).cache;
