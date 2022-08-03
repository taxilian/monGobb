
import 'tslib';
import { getDocWrapper } from './DocumentProxy';
import { eachSchema } from 'json-schema-library';
import ConsumerSchema from './testData/consumer.schema.json';

import MongoJsonSchema from './MongoJsonSchema';

test('use basic json schema stuff', () => {
  const schema = new MongoJsonSchema(ConsumerSchema);
  const doc = schema.getTemplate({});

  // eachSchema(schema.rootSchema, (schema, pointer) => {
  //   console.log(schema, pointer);
  // });

  console.log(doc);
});