
import { Draft04, addValidator, JSONSchema, getChildSchemaSelection, eachSchema } from 'json-schema-library';
import { ObjectId } from 'mongodb';

export default class MongoJsonSchema extends Draft04 {
  typeFields: string[] = ['bsonType', 'type'];

  constructor(schema: JSONSchema) {
    super(schema);

    this.typeKeywords['objectId'] = [
      'tsType', 'defaultAuto',
    ];

    // validator: (core: Core, schema: JSONSchema, value: any, pointer: JSONPointer): void | undefined | JSONError | Array<JSONError>;
    this.validateType['objectId'] = (core, schema, value, pointer) => {
      if (ObjectId.isValid(value)) {
        return [];
      }
      return [{
        type: 'error',
        name: 'objectId',
        code: 'INVALID_OBJECT_ID',
        message: 'Invalid objectId',
        data: {
          value,
          pointer,
        },
      }];
    };
  }

  getProperties() {
    const propertyMap: Record<string, JSONSchema> = {};

    /**
     * This is an incomplete solution for this problem -- it does not
     * cover cases of "anyOf", etc
     */
    for (const key of Object.keys(this.rootSchema.properties || {})) {
      propertyMap[key] = this.rootSchema.properties[key];
    }

    // eachSchema(this.rootSchema, (schema, pointer) => {
    //   if (pointer === '#') return;
    //   pointer = pointer.replace(/^\/properties\//, '');

    //   // We currently only care about immediate children
    //   if (pointer.includes('/')) return; 

    //   propertyMap[pointer] = schema;
    // }, '#', {
    //   typeFields: ['bsonType', 'type'],
    // });

    return propertyMap;
  }
};