// The build must refuse a bundle that does not parse and leave the previous lib/client.js alone.
import { mkdtempSync, cpSync, writeFileSync, readFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'cc-build-'));
// Copy the plugin root (this repo or the exported product tree), then run its own builder.
cpSync(pluginRoot, join(tmp, 'plugin'), { recursive: true, filter: (s) => !/[\\/](node_modules|\.cache|\.git)([\\/]|$)/.test(s) });
const lib = join(tmp, 'plugin', 'lib', 'client.js');
writeFileSync(lib, '// previous bundle\n');
const order = readFileSync(join(tmp, 'plugin', 'src', 'ORDER'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
appendFileSync(join(tmp, 'plugin', 'src', order[order.length - 1]), "\nconst broken = 'line\nbreak';\n");
const r = spawnSync(process.execPath, [join(tmp, 'plugin', 'tools', 'build.mjs')], { encoding: 'utf8' });
let fail = 0;
if (r.status === 0) { console.error('FAIL build accepted a bundle that does not parse'); fail++; }
if (readFileSync(lib, 'utf8') !== '// previous bundle\n') { console.error('FAIL previous bundle was overwritten'); fail++; }
if (!/build refused/.test(r.stderr || '')) { console.error('FAIL no refusal message'); fail++; }
console.log(`build_guard: ${fail ? 0 : 3} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
