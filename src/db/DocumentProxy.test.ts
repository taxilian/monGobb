
import 'tslib';
import { getProxyHandler } from './DocumentProxy';

import consumerSchema from './testData/consumer.schema.json';

test('basic schema conversions', () => {
  const proxyHandler = getProxyHandler(consumerSchema as any, {} as any, true);
  const proxied = new Proxy<any>({}, proxyHandler);

  expect(() => proxied._id = "fdsafjdslafdsafd").toThrow();
  
  proxied._id = "123412341234123412341234";
  expect(proxied._id.equals("123412341234123412341234")).toBeTruthy();

  proxied.name = "My consumer";
  expect(proxied.name).toBe("My consumer");

  proxied.count = "23";
  expect(proxied.count).toBe(23);
  expect(() => proxied.count = "asdf").toThrow();
});
