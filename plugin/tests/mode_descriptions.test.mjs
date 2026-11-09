// mode_descriptions.test.mjs - the chat mode menu (Plan, Orchestrate, Build, Design) reads its
// descriptions from ~/.dsh/cordis.patch.yml, which setup_deepseek_harness.py generates. Each
// description is one short line (at most 60 characters) and names Waypoint, never Meridian.
// Imports the generator read-only and calls render_presets(); it never runs the setup.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { test, done } from './harness.mjs';

// Machine-specific: the generator lives in the owner's own workspace, outside this product. Point
// WAYPOINT_PYTHON and WAYPOINT_DSH_SETUP at it to run these checks; otherwise they skip.
const PY = process.env.WAYPOINT_PYTHON || '';
const GEN = process.env.WAYPOINT_DSH_SETUP || '';
const CODE = [
  'import importlib.util, sys',
  'spec = importlib.util.spec_from_file_location("sdh", sys.argv[1])',
  'm = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)',
  'sys.stdout.write(m.render_presets())'
].join('\n');

function presets() {
  const r = spawnSync(PY, ['-I', '-c', CODE, GEN], { encoding: 'utf8', timeout: 30000 });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

if (!PY || !GEN || !existsSync(PY) || !existsSync(GEN)) {
  console.log('mode_descriptions: skipped (set WAYPOINT_PYTHON and WAYPOINT_DSH_SETUP to run it)');
} else {
  const yml = presets();

  test('every mode has a one-line description of at most 60 characters', () => {
    const descs = [...yml.matchAll(/^\s+description:\s*(.*)$/gm)].map((m) => m[1].replace(/^['"]|['"]$/g, ''));
    assert.equal(descs.length, 4, yml);
    for (const d of descs) {
      assert.ok(d.length > 0 && d.length <= 60, `${d.length} chars: ${d}`);
      assert.ok(!/\n/.test(d));
    }
  });

  test('the modes say Waypoint, never Meridian', () => {
    assert.ok(!/Meridian/.test(yml), 'Meridian still in mode text');
    assert.ok(/Waypoint/.test(yml));
  });
}

done('mode_descriptions');
