#!/usr/bin/env node -r tslib

import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import * as jsonToTs from 'json-schema-to-typescript';
import appRootPath from 'app-root-path';

const cwd = process.cwd();
const rootPath = path.join(cwd, process.argv[2] || '');
const projectRoot = String(appRootPath);
const scriptPath = path.relative(projectRoot, __filename);

import stringTpl from '../lib/utils/stringTpl';

export const bannerComment = stringTpl`
/**
 * This file was automatically generated by mongobb/buildJsonSchema
 * from \`${'filename'}\`.
 * 
 * To modify, update \`${'filename'}\`
 * and run \`node ${'scriptPath'}\` in the project root to regenerate this file.
 */

import {ObjectId} from 'mongodb';
`;

export const fileFooter = stringTpl`
import jsonSchema from './${'schemaFile'}';
export {jsonSchema};
`;

console.log("SCHEMA BUILD -- watching for schema files in " + rootPath);

const watcher = chokidar.watch(path.join(rootPath, '**', '*.schema.json'), {
  depth: 10, // max depth just in case
});

async function processFile(filePath: string, event: string) {
  const outPath = filePath.replace('.schema.json', '.ts');
  console.log(`${event}: Processing ${filePath} -> ${outPath}`);
  try {
    const schemaFile = path.basename(filePath);
    const schemaPath = path.relative(projectRoot, filePath);
    

    let compiled = await jsonToTs.compileFromFile(filePath, {
      enableConstEnums: true,
      bannerComment: bannerComment({
        filename: schemaPath,
        scriptPath,
      }),
    });
    compiled += fileFooter({schemaFile});
    await fs.promises.writeFile(outPath, compiled);
  } catch (err) {
    console.error(`Error processing ${filePath}`, err);
  }
}

watcher.on('add', (path, stats) => {
  processFile(path, 'add');
});
watcher.on('change', (path, stats) => {
  processFile(path, 'change');
});

// watcher.