
import * as mongodb from 'mongodb';
import { ObjectId, BSONTypeAlias } from 'mongodb';
import { JSONSchema4, JSONSchema4TypeName } from 'json-schema';
import MongoJsonSchema from './MongoJsonSchema';
import { ConversionError, coerceTypeFunction } from './coerceType';

import { CollectionConfig } from './CollectionConfig';

const magicKey = '__$_obj' as const;
type ProxiedDocOf<DocType> = DocType & {
  [magicKey]?: DocType;
}

type DocumentMethod<DocType> = (this: DocumentMethods<DocType> & DocType, ...args: any[]) => any;
export type DocumentMethodObject<DocType> = Record<string, DocumentMethod<DocType>>;
export type DocumentWrapper<DocType, Methods extends DocumentMethodObject<DocType>> = DocType & Methods;


function getDatabaseMethods<DocType extends Record<string, any>>(schema: JSONSchema4, collection: mongodb.Collection<DocType>) {
  return {
    toJSON(this: ProxiedDocOf<DocType>) { return this.__$_obj; },
    toBSON(this: ProxiedDocOf<DocType>) { return this.__$_obj; },
    toObject(this: ProxiedDocOf<DocType>) { return this.__$_obj; },
    // We have decided not to support this currently; we may change our minds later.
    // save(this: ProxiedDocOf<DocType>, options: mongodb.FindOneAndReplaceOptions = {}) { 
    //   const target = this.__$_obj!;
    //   return collection.findOneAndReplace({ _id: target._id }, target, {
    //     upsert: true,
    //     ...options,
    //   });
    // },
  };
}

type DocumentMethods<DocType extends Record<string, any>> = ReturnType<typeof getDatabaseMethods<DocType>>;

interface ProxyHandlerExtended<T extends object> extends ProxyHandler<T> {
  setDefaults(target: T): void;
}

export function getProxyHandler(schemaRaw: JSONSchema4, dbMethods: DocumentMethods<any>, strict = true) {
  const schemaObj = new MongoJsonSchema(schemaRaw);
  const fields = schemaObj.getProperties();
  const fieldNames = Object.keys(fields);
  const requiredFields = schemaObj.rootSchema.required ?? [];

  const getters: {[key: string]: (target: any) => any} = {};
  const setters: {[key: string]: (target: any, value: any) => boolean} = {};

  const defaultValues: {[key: string]: any} = {};

  for (const key of fieldNames) {
    const fieldSchema = schemaObj.getSchema(key, void 0);
    const type = (<BSONTypeAlias>fieldSchema.bsonType) || (<JSONSchema4TypeName>fieldSchema.type);
    const isRequired = requiredFields.includes(key);
    if (isRequired) {
      if (fieldSchema.default) {
        defaultValues[key] = fieldSchema.default;
      } else if (type === 'objectId' && fieldSchema.defaultAuto) {
        defaultValues[key] = () => new ObjectId();
      }
    }
    const coerceFn = coerceTypeFunction[type];
    function setFieldValue(target: any, value: any) {
      // Coerce the type if needed
      let newValue: any;
      try {
        newValue = coerceFn(value);
      } catch (err) {
        if (err instanceof ConversionError) {
          // Add the field name to the error message and re-throw
          throw new ConversionError(err.attemptedValue, err.targetType, key);
        }
        // Otherwise just re-throw
        throw err;
      }
      // Check if it's a valid value
      const isValid = schemaObj.isValid(newValue, fieldSchema);
      if (!isValid) {
        throw new ConversionError(newValue, JSON.stringify(fieldSchema), key);
      }
      target[key] = newValue;
      return true;
    }
    function getFieldValue(target: any) {
      const curValue = target[key];
      // Convert if needed
      return coerceFn(curValue);
    }
    if (type) {
      getters[key] = target => getFieldValue(target);
      setters[key] = (target, value) => setFieldValue(target, value);
    }
  }

  const ownKeys: string[] = [
    ...Object.keys(dbMethods),
    ...Object.keys(fields),
  ];

  const handler: ProxyHandlerExtended<Record<any, any>> = {
    get: (target, prop: string, receiver) => {
      if (prop === magicKey) { return target; }
      if (prop in getters) return getters[prop](target);
      if (prop in dbMethods) {
        return dbMethods[prop as keyof DocumentMethods<any>];
      }
      if (strict) { return void 0; }
      return target[prop];
    },
    set: (target, prop: string, value, receiver) => {
      if (prop in setters) {
        return setters[prop](target, value);
      }
      if (strict) { return false; }
      target[prop] = value;
      return true;
    },
    has: (target, key: string) => {
      return key in dbMethods || key in getters || key in setters;
    },
    ownKeys: (target) => {
      return ownKeys;
    },
    setDefaults: (target) => {
      for (const key of fieldNames) {
        if (key in target) { continue; }
        if (key in defaultValues) {
          const val = defaultValues[key];
          target[key] = typeof val === 'function' ? val(target) : val;
        }
      }
    }
  };

  return handler;
}

// type OnlyObject<T extends any> = T extends infer R ? R extends object ? R : never : never;
// type MyFromSchema<T extends JSONSchema> = T extends infer R ? OnlyObject<FromSchema<R, MongoDBTranslator>> : never;

export function getDocWrapper<DocType extends Record<string, any>,
                              methodObj extends DocumentMethodObject<DocType>,
                              >(collCfg: CollectionConfig<DocType>,
                                methods: methodObj = {} as methodObj,
                              ) {
  type docMethods = DocumentMethods<DocType>;

  let {schema, collection} = collCfg;
  

  const dbMethods = {
    ...methods,
    ...getDatabaseMethods<DocType>(schema, collection),
  };
  const modelProxyHandler = getProxyHandler(schema, dbMethods, true);

  return (doc: DocType = {} as any) => {
    // First, set defaults for the fields
    modelProxyHandler.setDefaults(doc);
    const proxied = new Proxy<DocType>(doc, modelProxyHandler);
    return proxied as DocumentWrapper<DocType, methodObj & docMethods>;
  }
}
