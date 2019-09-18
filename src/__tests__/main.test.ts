import lib from '../index';
import { Middleware } from '../Middleware';

describe('index entry', () => {
  it('returns a middleware instance', () => {
    expect(lib()).toBeInstanceOf(Function);
  });
});
