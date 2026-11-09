// Waypoint for dsh: dependency-free build. Concatenates the src files listed in src/ORDER into one
// dsh __ModuleLoader__ factory at lib/client.js. Works from the plugin root in this repo
// (plugin/tools/build.mjs) and in the exported product tree (tools/build.mjs).
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
// dsh keys the client module table by package name: the factory id must equal package.json "name".
const ID = pkg.name;
const VERSION = String(pkg.version || '0.0.0');
const order = readFileSync(join(root, 'src', 'ORDER'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const parts = order.map(name => {
  const file = join(root, 'src', name);
  if (!existsSync(file)) { console.warn('skipping missing src file ' + name); return ''; }
  return '\t\t// ── ' + name + '\n' + readFileSync(file, 'utf8');
});
// The whole factory body is guarded: dsh loads every bolt-on in one shared startup, so a
// top-level error in any src file must not escape. It logs one warning and yields a no-op apply.
const out = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(ID)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		try {
		var React = require("react");
		var CC = { React: React, h: React.createElement, version: ${JSON.stringify(VERSION)} };
${parts.join('\n')}
		exports.apply = function (ctx) {
			try { return CC.apply(ctx); }
			catch (e) { try { console.warn("[waypoint] apply failed; Waypoint skipped: " + (e && e.message ? e.message : e)); } catch (_) {} }
		};
		exports.inject = CC.inject;
		} catch (e) {
			try { console.warn("[waypoint] bundle failed to load; Waypoint disabled: " + (e && e.message ? e.message : e)); } catch (_) {}
			exports.apply = function () {};
			exports.inject = [];
		}
		return module.exports;
	}
});
`;
// Never ship a bundle that does not parse: a half-edited source file once reached the live app
// during a review. Parse first; on failure keep the previous bundle and exit 1.
try {
	new Function(out);
} catch (e) {
	console.error('build refused: the bundle does not parse (' + e.message + '); lib/client.js left unchanged.');
	console.error('run `node --check src/<file>.js` on the file you are editing.');
	process.exit(1);
}
mkdirSync(join(root, 'lib'), { recursive: true });
writeFileSync(join(root, 'lib', 'client.js'), out);
console.log('built lib/client.js (' + ID + ' ' + VERSION + ') from', order.length, 'files,', out.length, 'bytes');
