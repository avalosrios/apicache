import { Middleware } from './Middleware';
const DEFAULT_DURATION = '1 hour';
export = ( duration?: string ) => new Middleware(duration || DEFAULT_DURATION);
