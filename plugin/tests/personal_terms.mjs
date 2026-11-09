// personal_terms.mjs - node loader for tools/personal_terms.json, the single list of personal terms
// that must never ship. Terms are stored base64-encoded so the list never matches itself.
// Matching: case-insensitive substring; slashes and runs of backslashes count as one separator.
//   import { personalHits } from './personal_terms.mjs';
//   assert.deepEqual(personalHits(src), [], file);
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, '..', 'tools', 'personal_terms.json'), 'utf8'));
const decode = (b64) => Buffer.from(b64, 'base64').toString('utf8');
const normalise = (text) => String(text).replace(/[\\/]+/g, '/').toLowerCase();

export const TERMS = data.terms.map((t) => ({ kind: t.kind, term: decode(t.b64) }));
export const OWNER_FIRST = TERMS.find((t) => t.kind === 'owner-first-name').term;
const NORMAL = TERMS.map((t) => normalise(t.term));

// The personal terms found in text (empty when clean).
export function personalHits(text) {
  const n = normalise(text);
  return TERMS.filter((t, i) => n.includes(NORMAL[i])).map((t) => t.kind + ': ' + t.term);
}
