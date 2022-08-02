
import * as mongodb from 'mongodb';
import { JSONSchema4 } from 'json-schema';
import stripSchema from '../lib/utils/stripSchema';
import camelCase from 'lodash/camelCase';

interface IndexSpecification {
  [key: string]: mongodb.IndexDirection;
}
type IndexDefinition = IndexSpecification
  | [IndexSpecification]
  | [IndexSpecification, mongodb.CreateIndexesOptions];

const collectionFindFns = [
  'find', 'findOne', 'findOneAndDelete', 'findOneAndReplace',
] as const;

const collectionFnsToMap = [
  'aggregate', 'bulkWrite', 'count', 'countDocuments',
  'deleteMany', 'deleteOne', 'distinct', 'drop', 'dropIndexes',
  'estimatedDocumentCount', 'indexExists', 'indexInformation',
  'insertOne', 'insertMany', 'replaceOne', 'options', 'stats', 'updateMany', 'updateOne',
  'watch', 'initializeOrderedBulkOp', 'initializeUnorderedBulkOp',
  ...collectionFindFns,
] as const;
type collectionFnsToMap = typeof collectionFnsToMap[number];

export interface CollectionOptions {
  db: mongodb.Db;
  indexes?: IndexDefinition[];
  /**
   * The json schema to use for validation.
   */
  schema: JSONSchema4;
  /**
   * If not specified, the collection name is auto detected from the json schema title
   */
  name?: string;

  collectionOpts?: mongodb.CollectionOptions;
}

export type ModelFunctions<CollectionConfig> = {
  [key: string]: (this: CollectionConfig, ...args: any) => any;
};



class CollectionConfigImpl<DocType> {
  private _collection: mongodb.Collection<DocType>;

  get db() { return this.opts.db; }
  get schema() { return this.opts.schema; }
  private get mongoSchema() { return stripSchema(this.opts.schema);}
  get collection() { return this._collection; }

  constructor(protected opts: CollectionOptions) {
    const {db, schema} = opts;
    let collectionName = opts.name;
    if (!collectionName) {
      opts.name = collectionName = camelCase(schema.title ?? '');
      if (!collectionName) {
        throw new Error("Collection name or titled schema is required");
      }
    }
    this._collection = db.collection<DocType>(collectionName, {
      ...(opts.collectionOpts ?? {}),
    });
  }

  ensureIndexes() {
    const {collection, opts} = this;
    const {indexes} = opts;
    const promiseList = indexes?.map(async index => {
      if (Array.isArray(index)) {
        if (index.length === 2) return collection.createIndex(index[0], index[1]);
        else return collection.createIndex(index[0]);
      } else return collection.createIndex(index);
    }) ?? [];
    return Promise.all(promiseList);
  }

  async applySchema() {
    const {db} = this;
    const list = await db.listCollections({name: this.collection.collectionName}, {nameOnly: true}).toArray();
    const validator = {
      $jsonSchema: this.mongoSchema,
    };
    if (!list.length) {
      await db.createCollection(this.opts.name!, {
        validator,
      });
    } else {
      await db.command({
        collMod: this.opts.name!,
        validator,
      });
    }
  }

  makeModel<Wrap extends (doc?: DocType) => DocType, T extends ModelFunctions<this & {wrap: Wrap}>>(wrapFn: Wrap, fnObject: T) {
    const topModel: any = function CollectionModel() {}
    topModel.prototype = this;
    const midModel: any = function SpecializedModel() {}
    midModel.prototype = new topModel();
    for (const fn of Object.keys(fnObject)) {
      midModel.prototype[fn] = fnObject[fn];
    }
    midModel.prototype.wrap = wrapFn;

    const outModel: this & T & {wrap: Wrap} = new midModel();
    return outModel;
  }
}

/**
 * This class is a simple wrapper around a mongodb collection;
 * it doesn't (and shouldn't) do a lot on top of what the actual
 * collection does, but it proxies most calls through to it as
 * a convenience and adds some extra functionality, plus adds
 * some opinionated features like validation and indexing.
 * 
 * Note that type CollectionConfig type is used instead of using the actual class
 * so that we can easily proxy types for Collection methods through the class instance
 */
export type CollectionConfig<DocType> = CollectionConfigImpl<DocType> & Pick<mongodb.Collection<DocType>, collectionFnsToMap>;

// Add collection functions to the object even if typescript doesn't like it
for (const fnName of collectionFnsToMap) {
  (<CollectionConfig<any>>CollectionConfigImpl.prototype)[fnName] = function(this: CollectionConfig<any>, ...args: any[]) { return (<any>this.collection)[fnName](...args); };
}

/**
 * Creates a collection config object which wraps the collection and provides many of the same methods;
 * you can still access the original collection and underlying database with the `collection` and
 * `db` properties
 * @param opts The options to use for the collection
 * @returns The collection config object
 */
export function getCollection<DocType>(opts: CollectionOptions): CollectionConfig<DocType> {
  // Typescript doens't know we augmented the object prototype, so it thinks this is invalid -- it is
  // WRONG WRONG WRONG! (because we put them there a few lines up)
  return new CollectionConfigImpl<DocType>(opts) as any;
}
