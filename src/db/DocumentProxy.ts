
import * as mongodb from 'mongodb';
import { ObjectId, BSONTypeAlias } from 'mongodb';
import { JSONSchema4 } from 'json-schema';
import { coerceTypeIfNeeded } from './schemaChecks';

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

function getProxyHandler(schema: JSONSchema4, strict = false, dbMethods: DocumentMethods<any>) {
  const getters: {[key: string]: (target: any) => any} = {};
  const setters: {[key: string]: (target: any, value: any) => void} = {};
  for (const key of Object.keys(schema.properties ?? {})) {
    const schemaDef = schema.properties![key];
    const type = (<BSONTypeAlias>schemaDef.bsonType) || schemaDef.type;
    if (type) {
      if (key === '_id' && type === 'objectId') {
        getters[key] = (target: any) => {
          if (!target._id) {
            target._id = new ObjectId();
          }
          return coerceTypeIfNeeded(target._id, 'objectId');
        };
      } else {
        getters[key] = target => coerceTypeIfNeeded(target[key], type);
      }

      setters[key] = (target, value) => {
        target[key] = coerceTypeIfNeeded(value, type);
      };
    }
  }

  const ownKeys: string[] = [
    ...Object.keys(dbMethods),
    ...Object.keys(schema?.properties ?? {}),
  ];

  const handler: ProxyHandler<Record<any, any>> = {
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
        setters[prop](target, value);
        return true;
      }
      return false;
    },
    has: (target, key: string) => {
      return key in dbMethods || key in getters || key in setters;
    },
    ownKeys: (target) => {
      return ownKeys;
    },
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
  const modelProxyHandler = getProxyHandler(schema, true, dbMethods);

  return (doc: DocType = {} as any) => {
    const proxied = new Proxy<DocType>(doc, modelProxyHandler);
    return proxied as DocumentWrapper<DocType, methodObj & docMethods>;
  }
}
