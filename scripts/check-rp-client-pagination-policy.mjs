import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decodeClientListCursor,
  encodeClientListCursor,
} from '../lib/rpClientPagination.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(rootDir, file), 'utf8');

const source = {
  id: 'RP-20260711-0001',
  updatedAt: '2026-07-11T12:34:56.789Z',
  createdAt: '2026-07-10T01:02:03.004Z',
};
const cursor = encodeClientListCursor(source);

assert.deepEqual(decodeClientListCursor(cursor), source);
assert.equal(decodeClientListCursor(''), null);
assert.throws(() => decodeClientListCursor('not+a+cursor'), /Invalid customer pagination cursor/);
assert.throws(() => decodeClientListCursor('A'.repeat(769)), /Invalid customer pagination cursor/);

assert.match(read('app/api/rp/clients/route.js'), /nextCursor/);
assert.match(read('lib/rpDatabase.js'), /WHERE \(updated_at, created_at, id\) </);
assert.match(read('components/rp-consultation/RPClientManager.jsx'), /clientPagination\?\.nextCursor/);
assert.match(read('database/migrations/20260711_client_cursor_pagination.sql'), /rp_clients_page_cursor_idx/);

console.log('RePERFORMANCE customer cursor pagination policy check');
console.log('Summary: 8/8 cursor pagination checks passed');
