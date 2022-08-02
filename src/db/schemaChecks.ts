
import { ObjectId } from 'mongodb';
import type { BSONTypeAlias } from 'mongodb';

import type { JSONSchema4TypeName } from 'json-schema'
type AnyValidType = JSONSchema4TypeName | BSONTypeAlias;

export function neverError(v: never) {
  return new Error(`Unexpected type: ${v}`);
}

export const typeCheck = <const>{
  any: (value: any) => true,
  string: (value: any) => typeof value === 'string',
  int: (value: any) => typeof value === 'number' && Math.floor(value) === value,
  integer: (value: any) => typeof value === 'number' && Math.floor(value) === value,
  number: (value: any) => typeof value === 'number',
  long: (value: any) => typeof value === 'bigint',
  double: (value: any) => typeof value === 'number',
  decimal: (value: any) => typeof value === 'number',
  regex: (value: any) => value instanceof RegExp,
  object: (value: any) => typeof value === 'object',
  array: (value: any) => Array.isArray(value),
  boolean: (value: any) => typeof value === 'boolean',
  bool: (value: any) => typeof value === 'boolean',
  null: (value: any) => value === null,
  undefined: (value: any) => value === void 0,
  date: (value: any) => value instanceof Date,
  binData: (value: any) => value instanceof Buffer,
  objectId: (value: any) => value instanceof ObjectId,
  javascript: (value: any) => false,
  symbol: (value: any) => false,
  javascriptWithScope: (value: any) => false,
  minKey: (value: any) => false,
  maxKey: (value: any) => false,
  dbPointer: (value: any) => false,
  timestamp: (value: any) => false,
}
export const coerceType = <const>{
  any: (value: any) => value,
  string: (value: any) => typeof(value) === 'undefined' ? value : String(value),
  int: (value: any) => typeof(value) === 'undefined' ? value : Math.floor(value),
  integer: (value: any) => typeof(value) === 'undefined' ? value : Math.floor(value),
  number: (value: any) => typeof(value) === 'undefined' ? value : Number(value),
  long: (value: any) => typeof(value) === 'undefined' ? value : BigInt(value),
  double: (value: any) => typeof(value) === 'undefined' ? value : parseFloat(String(value)),
  decimal: (value: any) => typeof(value) === 'undefined' ? value : parseFloat(String(value)),
  regex: (value: any) => typeof(value) === 'undefined' ? value : new RegExp(value),
  object: (value: any) => value,
  array: (value: any) => value,
  boolean: (value: any) => Boolean(value),
  bool: (value: any) => Boolean(value),
  null: (value: any) => null,
  undefined: (value: any) => void 0,
  date: (value: any) => typeof(value) === 'undefined' ? value : new Date(value),
  binData: (value: any) => typeof(value) === 'undefined' ? value : Buffer.from(value),
  objectId: (value: any, raw?: boolean) => typeof(value) === 'undefined' ? value : new ObjectId(value),
  javascript: (value: any) => { throw new Error("Not implemented") },
  symbol: (value: any) => { throw new Error("Not implemented") },
  javascriptWithScope: (value: any) => { throw new Error("Not implemented") },
  minKey: (value: any) => { throw new Error("Not implemented") },
  maxKey: (value: any) => { throw new Error("Not implemented") },
  dbPointer: (value: any) => { throw new Error("Not implemented") },
  timestamp: (value: any) => { throw new Error("Not implemented") },
}

export function isCorrectType(value: any, type: AnyValidType | AnyValidType[]) {
  type = Array.isArray(type) ? type : [type];

  const checkFns = type.map(t => typeCheck[t] || neverError);
  return checkFns.some(fn => fn(value));
}

export function coerceTypeIfNeeded(value: unknown, type: AnyValidType | AnyValidType[], raw = false) {
  if (isCorrectType(value, type)) {
    return value;
  } else {
    const firstType = Array.isArray(type) ? type[0] : type;
    const coerceFn = coerceType[firstType] || neverError;
    return coerceFn(value, raw);
  }
}