const IORedis: any = jest.genMockFromModule('ioredis');

const keyValue: any = {};

const deleteKey = (key: string) => {
    delete keyValue[key];
    return Promise.resolve(true);
};

const getKey = (key: string) => {
    if (keyValue[key]) {
        return Promise.resolve(keyValue[key].value);
    }

    return Promise.resolve(undefined);
};

const mGetKey = (key: string, cb: any) => getKey(key).then(val => [val]);

const setKey = (key: string, value: any, type: any, ttl: any) => {
    keyValue[key] = {
        value,
        ttl,
    };
    setTimeout(() => {
        delete keyValue[key];
    }, ttl * 1000);
    return Promise.resolve(true);
};

IORedis.prototype.del.mockImplementation(deleteKey);
IORedis.prototype.get.mockImplementation(getKey);
IORedis.prototype.mget.mockImplementation(mGetKey);
IORedis.prototype.set.mockImplementation(setKey);

export default IORedis;
