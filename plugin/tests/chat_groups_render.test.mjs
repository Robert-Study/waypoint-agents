// Live smoke finding: opening a session with messages crashed (`groups` undefined in ChatPanel).
// Static guard: the thread renderer's `groups` must be defined from groupItems before use.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/chat_panel.js', import.meta.url), 'utf8');
const def = src.indexOf('const groups = groupItems(items)');
const use = src.indexOf('groups.map(');
let fail = 0;
if (def < 0) { console.error('FAIL groups is never defined from groupItems(items)'); fail++; }
else if (use >= 0 && def > use) { console.error('FAIL groups is used before it is defined'); fail++; }
console.log(`chat_groups_render: ${fail ? 0 : 1} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
