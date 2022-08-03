
import { ObjectId } from 'mongodb';
import type { BSONTypeAlias } from 'mongodb';
import {NodeError} from '../lib/utils/error';

import type { JSONSchema4TypeName } from 'json-schema'
type AnyValidType = JSONSchema4TypeName | BSONTypeAlias;

export function neverError(v: never) {
  return new Error(`Unexpected type: ${v}`);
}

export class ConversionError extends NodeError {
  constructor(public attemptedValue: string, public targetType: string, public key?: string) {
    let message: string;
    if (key) {
      message = `Could not convert ${attemptedValue} to ${targetType} for key ${key}`;
    } else {
      message = `Could not convert ${attemptedValue} to ${targetType}`;
    }
    super(`ConversionError: "${message}"`);
  }

  get name() { return this.constructor.name }
}

const boolValues = {
  true: true,
  t: true,
  false: false,
  f: false,
  '1': true,
  '0': false,
};

// export const typeCheck = <const>{
//   any: (value: any) => true,
//   string: (value: any) => typeof value === 'string',
//   int: (value: any) => typeof value === 'number' && Math.floor(value) === value,
//   integer: (value: any) => typeof value === 'number' && Math.floor(value) === value,
//   number: (value: any) => typeof value === 'number',
//   long: (value: any) => typeof value === 'bigint',
//   double: (value: any) => typeof value === 'number',
//   decimal: (value: any) => typeof value === 'number',
//   regex: (value: any) => value instanceof RegExp,
//   object: (value: any) => typeof value === 'object',
//   array: (value: any) => Array.isArray(value),
//   boolean: (value: any) => typeof value === 'boolean',
//   bool: (value: any) => typeof value === 'boolean',
//   null: (value: any) => value === null,
//   undefined: (value: any) => value === void 0,
//   date: (value: any) => value instanceof Date,
//   binData: (value: any) => value instanceof Buffer,
//   objectId: (value: any) => value instanceof ObjectId,
//   javascript: (value: any) => false,
//   symbol: (value: any) => false,
//   javascriptWithScope: (value: any) => false,
//   minKey: (value: any) => false,
//   maxKey: (value: any) => false,
//   dbPointer: (value: any) => false,
//   timestamp: (value: any) => false,
// }

/**
 * Autojmatically converting to string is fine,
 * so long as it is a real useful toString, not
 * just one of the built-in types that don't
 * have a useful toString.
 **/
const invalidStringConversions = [
  Array.prototype.toString,
  Object.prototype.toString,
  Function.prototype.toString,
  Symbol.prototype.toString,
  Error.prototype.toString,
  RegExp.prototype.toString,

  // -- these are the primitive ones that we are okay with
  // String.prototype.toString,
  // Boolean.prototype.toString,
  // Number.prototype.toString,
  // Date.prototype.toString,
];

export const coerceTypeFunction = <const>{
  any(value: any) { return value; },
  string(value: any) {
    if (['string', 'undefined'].includes(typeof value)) return value;
    if (value?.toString && !invalidStringConversions.includes(value.toString)) {
      return value.toString();
    }
    throw new ConversionError(value, 'string');
  },
  int(value: any) {
    if (typeof value === 'number') return Math.floor(value);
    else if (typeof value === 'string') {
      return parseInt(value, 10);
    } else if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    throw new ConversionError(value, 'int');
  },
  integer(value: any) { return coerceTypeFunction.int(value); },
  number(value: any) {
    if (typeof value === 'number') return value;
    else if (typeof value === 'string') {
      const numVal = Number(value);
      if (!isNaN(numVal)) return numVal;
    } else if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    throw new ConversionError(value, 'number');
  },
  long(value: any) {
    if (typeof value === 'bigint') return value;
    else if (typeof value === 'string' || value === 'number') {
      return BigInt(value);
    } else if (typeof value === 'boolean') {
      return value ? 1n : 0n;
    }
    throw new ConversionError(value, 'long');
  },
  double(value: any) {
    if (typeof value === 'number') return value;
    else if (typeof value === 'string') {
      return parseFloat(value);
    } else if (typeof value === 'boolean') {
      return value ? 1.0 : 0.0;
    }
    throw new ConversionError(value, 'double');
  },
  // double: (value: any) => typeof(value) === 'undefined' ? value : parseFloat(String(value)),
  decimal(value: any) { return coerceTypeFunction.number(value); },
  regex: (value: any) => typeof(value) === 'undefined' ? value : new RegExp(value),
  
  object: (value: any) => value,
  array: (value: any) => value,
  
  boolean(value: any) {
    if (['number', 'boolean'].includes(typeof value)) return Boolean(value);
    else if (typeof value === 'string' && value in boolValues) return boolValues[value as 't'];
    
    throw new ConversionError(value, 'boolean');
  },
  bool(value: any) { return coerceTypeFunction.boolean(value); },

  null: (value: any) => null,
  undefined: (value: any) => void 0,

  date(value: any) {
    if (value instanceof Date) return value;
    if (['number', 'string'].includes(typeof value)) {
      const dt = new Date(value);
      if (dt.toString() !== 'Invalid Date') return dt;
    }
    throw new ConversionError(value, 'date');
  },

  binData: (value: any) => typeof(value) === 'undefined' ? value : Buffer.from(value),

  objectId(value: any) {
    if (ObjectId.isValid(value)) {
      return new ObjectId(value);
    }

    throw new ConversionError(value, 'objectId');
  },


  javascript: (value: any) => { throw new Error("Not implemented") },
  symbol: (value: any) => { throw new Error("Not implemented") },
  javascriptWithScope: (value: any) => { throw new Error("Not implemented") },
  minKey: (value: any) => { throw new Error("Not implemented") },
  maxKey: (value: any) => { throw new Error("Not implemented") },
  dbPointer: (value: any) => { throw new Error("Not implemented") },
  timestamp: (value: any) => { throw new Error("Not implemented") },
}

