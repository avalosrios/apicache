export const debug = (args: any) => {
    const arr = (['\x1b[36m[apicache]\x1b[0m', ...args]).filter((arg) => arg !== undefined );
    const debugEnv = process.env.DEBUG && process.env.DEBUG.split(',').indexOf('apicache') !== -1;
    return debugEnv && console.log.apply(null, arr[0]);
};
