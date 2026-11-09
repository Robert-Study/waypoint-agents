// Writes wpc_fixtures.json: neutral answers for the Waypoint server (CC.wpc) that the 2.0 tabs read in the
// preview harness. Every name, path and project here is invented (an "Alex" with a few demo projects).
// Times are written as "@now", "@now-15m", "@now+3h" or "@now+2d"; preview.mjs turns them into ISO times
// when it serves them, so "resets in 3h" stays true in every screenshot.
//
//   node plugin/tools/preview/make_wpc_fixtures.mjs        (rewrites plugin/tools/preview/wpc_fixtures.json)
//
// File shape: { features, calls: { "<tool>": payload, "<tool> <JSON input>": payload } }. preview.mjs looks up
// the exact "<tool> <input>" key first, then "<tool>".
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'wpc_fixtures.json');

// ---------------------------------------------------------------- projects and boards
const projects = [
  { id: 'notes-app-v2', title: 'Notes app', status: 'active', archived: false, rev: 4, version: 2, version_label: 'v2', version_range: null, family: 'notes-app', subtitle: null },
  { id: 'notes-app-v1', title: 'Notes app', status: 'active', archived: true, rev: 9, version: 1, version_label: 'v1', version_range: null, family: 'notes-app', subtitle: null },
  { id: 'docs-site-v1', title: 'Docs site', status: 'active', archived: false, rev: 2, version: 1, version_label: 'v1', version_range: null, family: 'docs-site', subtitle: null },
  { id: 'data-pipeline-v3', title: 'Data pipeline', status: 'active', archived: false, rev: 6, version: 3, version_label: 'v3', version_range: null, family: 'data-pipeline', subtitle: null },
  { id: 'data-pipeline-v2', title: 'Data pipeline', status: 'active', archived: true, rev: 11, version: 2, version_label: 'v2', version_range: null, family: 'data-pipeline', subtitle: null },
  { id: 'cli-tool-v1', title: 'Command-line tool', status: 'draft', archived: false, rev: 1, version: 1, version_label: 'v1', version_range: null, family: 'cli-tool', subtitle: null }
];

const needs = [
  { id: 'nq-demo-1', project: 'notes-app-v2', node: 'sync-design', kind: 'items',
    problem: 'Sync design: two choices decide how offline edits merge.',
    resolution: 'Answer below; the agent then writes the sync plan.', options: null, recommended: null,
    items: [
      { id: '1', prompt: 'Last write wins is simple and good enough for one person on two devices. Agree?', kind: 'scale', options: null },
      { id: '2', prompt: 'Which devices must sync in the first release?', kind: 'multi', options: ['Desktop', 'Phone', 'Tablet', 'Web'] },
      { id: '3', prompt: 'Keep deleted notes for how long?', kind: 'choice', options: ['7 days', '30 days', 'forever'] }
    ],
    created_at: '@now-3h', explain: null, option_notes: null, session: null, snooze_until: null },
  { id: 'nq-demo-2', project: 'data-pipeline-v3', node: 'pick-format', kind: 'choice',
    problem: 'Storage format for the daily tables: Parquet is smaller and faster to read; CSV is easier to open by hand.',
    resolution: 'Parquet, with a CSV export command for spot checks.', options: ['Parquet', 'CSV'], recommended: 'Parquet',
    items: null, created_at: '@now-50m', explain: null, option_notes: null, session: null, snooze_until: null }
];

const todos = [
  { id: 'td-demo-1', text: 'Release notes for Notes app 2.0. Read the draft and say ship or not yet.', category: 'decisions', rev: 1, project: 'notes-app-v2', order: 1, link: 'https://example.com/notes-app/releases/draft', session: null, snooze_until: null },
  { id: 'td-demo-2', text: 'Docs site navigation. Open the preview and check the new sidebar order.', category: 'review', rev: 1, project: 'docs-site-v1', order: 2, link: 'https://example.com/docs-preview', session: null, snooze_until: null },
  { id: 'td-demo-3', text: 'Pick a licence for the command-line tool (MIT or Apache-2.0).', category: 'decisions', rev: 2, project: 'cli-tool-v1', order: 3, link: null, session: null, snooze_until: null },
  { id: 'td-demo-4', text: 'Record a 2-minute demo of offline editing on the phone.', category: 'hands_on', rev: 1, project: 'notes-app-v2', order: 4, link: null, session: null, snooze_until: null },
  { id: 'td-demo-5', text: 'Sign in to the test cloud account once so the sync tests can run.', category: 'hands_on', rev: 1, project: null, order: 5, link: null, session: null, snooze_until: null }
];

function node(id, title, status, deps, extra) {
  return Object.assign({ id, title, status, rev: 1, slot: null, role: null, kind: 'build', lane: 'build', estimate: 1, tags: [], deps: deps || [],
    float: { early: 0, late: 0, float: 0, critical: false }, claim: null, needs: [] }, extra || {});
}
const boards = {
  'notes-app-v2': [
    node('discovery', 'Discovery questions', 'done', [], { kind: 'discovery', goal: 'Agree the scope of version 2.' }),
    node('data-model', 'Note and folder model', 'done', ['discovery'], { goal: 'Notes, folders and tags as plain JSON files.', check: { type: 'command', command: 'npm test -- model' } }),
    node('editor', 'Markdown editor', 'done', ['data-model']),
    node('search', 'Full-text search', 'running', ['data-model'], { claim: { owner: 'worker', claimed_by: 'codex', since: '@now-25m' }, goal: 'Search titles and bodies in under 50 ms for 10,000 notes.', check: { type: 'command', command: 'npm test -- search' } }),
    node('sync-design', 'Offline sync design', 'needs_you', ['data-model'], { needs: [needs[0]] }),
    node('sync', 'Sync engine', 'not_started', ['sync-design']),
    node('phone-ui', 'Phone layout', 'failed', ['editor'], { evidence: 'Two layout tests fail at 360 px width.' }),
    node('demo-video', 'Demo video', 'not_started', ['sync', 'phone-ui'], { kind: 'hands_on', role: 'human' }),
    node('release', 'Release 2.0', 'not_started', ['search', 'demo-video'])
  ],
  'notes-app-v1': [node('mvp', 'First release', 'done', []), node('feedback', 'Collect feedback', 'done', ['mvp'])],
  'docs-site-v1': [
    node('outline', 'Page outline', 'done', []),
    node('theme', 'Light and dark theme', 'done', ['outline']),
    node('nav', 'Sidebar navigation', 'needs_you', ['outline']),
    node('search-box', 'Search box', 'running', ['theme'], { claim: { owner: 'worker', claimed_by: 'gemini', since: '@now-8m' } }),
    node('publish', 'Publish the site', 'not_started', ['nav', 'search-box'])
  ],
  'data-pipeline-v3': [
    node('sources', 'List the sources', 'done', []),
    node('pick-format', 'Storage format', 'needs_you', ['sources'], { needs: [needs[1]] }),
    node('ingest', 'Daily ingest job', 'done', ['sources']),
    node('clean', 'Cleaning rules', 'running', ['ingest'], { claim: { owner: 'worker', claimed_by: 'local-model', since: '@now-4m' } }),
    node('tables', 'Daily tables', 'not_started', ['pick-format', 'clean']),
    node('report', 'Weekly report', 'not_started', ['tables'])
  ],
  'data-pipeline-v2': [node('ingest', 'Ingest', 'done', []), node('tables', 'Tables', 'done', ['ingest'])],
  'cli-tool-v1': [node('commands', 'Command list', 'not_started', []), node('parser', 'Argument parser', 'not_started', ['commands'])]
};

const calls = {};
calls.board_read = { projects, todos, needs };
for (const p of projects) {
  const ps = projects.find(x => x.id === p.id);
  calls['board_read ' + JSON.stringify({ project: p.id })] = {
    project: { schema: 'waypoint.project.v1', id: p.id, title: ps.title, brief: 'Demo project.', archived: ps.archived, status: ps.status,
      family: ps.family, version: ps.version, version_label: ps.version_label, rev: ps.rev, updated_at: '@now-1h', updated_by: 'cli' },
    nodes: boards[p.id], cycle: null,
    todos: todos.filter(t => t.project === p.id), needs: needs.filter(n => n.project === p.id)
  };
}

// ---------------------------------------------------------------- running and usage
calls.ops_read = {
  running: [
    { project: 'notes-app-v2', node: 'search', by: 'codex', since: '@now-25m', run: 'run-demo-1' },
    { project: 'docs-site-v1', node: 'search-box', by: 'gemini', since: '@now-8m', run: 'run-demo-2' },
    { project: 'data-pipeline-v3', node: 'clean', by: 'local-model', since: '@now-4m', run: 'run-demo-3' }
  ],
  pools: [
    { pool: 'claude_5h', source: 'claude', provider: 'claude', remaining_percent: 64, resets_at: '@now+2h', observed_at: '@now-3m', floor: 20, below_floor: false },
    { pool: 'claude_week', source: 'claude', provider: 'claude', remaining_percent: 48, resets_at: '@now+4d', observed_at: '@now-3m', floor: 15, below_floor: false },
    { pool: 'codex_5h', source: 'codex', provider: 'codex', remaining_percent: 31, resets_at: '@now+1h', observed_at: '@now-5m', floor: 25, below_floor: false },
    { pool: 'codex_week', source: 'codex', provider: 'codex', remaining_percent: 72, resets_at: '@now+5d', observed_at: '@now-5m', floor: null, below_floor: false },
    { pool: 'gemini_day', source: 'gemini', provider: 'gemini', remaining_percent: 12, resets_at: '@now+9h', observed_at: '@now-12m', floor: 15, below_floor: true }
  ],
  providers: [
    { id: 'claude', label: 'Claude Code', enabled: true, pool: 'claude_5h', state: 'up', reason: null, rev: 1 },
    { id: 'codex', label: 'Codex CLI', enabled: true, pool: 'codex_5h', state: 'up', reason: null, rev: 1 },
    { id: 'gemini', label: 'Gemini CLI', enabled: true, pool: 'gemini_day', state: 'down', reason: 'Usage check timed out; kept the last reading.', rev: 2 },
    { id: 'local-model', label: 'Local model (free)', enabled: true, pool: null, state: 'up', reason: null, rev: 1 },
    { id: 'api-pool', label: 'API key pool', enabled: false, pool: null, state: 'disabled', reason: null, rev: 1 }
  ],
  sprints: [
    { id: 'sprint-demo-1', project: 'notes-app-v2', mode: 'balanced', start: '@now+6h', window: 'tonight, 6 hours', next: true, overnight: true, last_result: null, last_ended: null },
    { id: 'sprint-demo-2', project: 'data-pipeline-v3', mode: 'fast', start: '@now-1d', window: 'yesterday, 3 hours', next: false, overnight: false, last_result: 'done', last_ended: '@now-21h' }
  ],
  usage_refreshing: false
};

// ---------------------------------------------------------------- preferences and toolbox
function pref(id, title, paragraphs, tags, weight, extra) {
  return Object.assign({ id, title, paragraphs, tags, captured_at: '2026-11-0' + (1 + (weight % 8)), weight, evidence_status: 'explicit_user_statement', skill_edits: [],
    sources: [{ verbatim: paragraphs[0], stated_at: '2026-11-0' + (1 + (weight % 8)), origin: 'chat', location: 'session with Alex' }] }, extra || {});
}
const pending = [
  pref('p-small-agents', 'Small tasks go to free agents', ['Send routine edits and lookups to a free agent; keep the strong model for planning and review.'], ['agents', 'cost'], 9,
    { skill_edits: [{ skill: 'project-orchestrator', section: 'Dispatch', text: 'Give routine nodes to a free pool first; escalate only after one failed try.', evidence: 'Routine work: free pool first.' }] }),
  pref('p-check-first', 'Write the check before the code', ['Every Waypoint task names its done-check first, and the worker sees it fail before the change.'], ['waypoint', 'testing'], 8),
  pref('p-short-status', 'Status in three lines', ['Agents report status in at most three short lines; details go in the receipt.'], ['agents', 'writing'], 7),
  pref('p-model-pick', 'Pick the cheapest model that passes', ['Choose the model by price among the ones that pass the check, not by habit.'], ['models', 'cost'], 6),
  pref('p-dark-mode', 'Every tab works in dark mode', ['dsh tabs must read well in light and dark themes; check both before release.'], ['dsh', 'design'], 5),
  pref('p-plain-words', 'Plain words in labels', ['Use short, plain words on buttons and headings in the harness; no jargon.'], ['harness', 'writing'], 4)
];
calls.pref_list = { counts: { pending: pending.length, active: 42, superseded: 9, retired: 2 }, pending };

const tb = (id, name, kind, provider, status, notes) => ({ id, name, kind, provider, access: kind === 'cli' ? 'Command line' : 'App and command line', cost: kind === 'subscription' ? 'monthly plan' : 'free', status, notes, source: 'toolbox.json' });
calls.toolbox_read = {
  schema: 'waypoint.toolbox.v1', updated_at: '2026-11-08', sources: ['toolbox.json'],
  items: [
    tb('team-plan', 'Team subscription', 'subscription', 'Example AI', 'on', 'Covers the chat app and the coding CLI.'),
    tb('strong-model', 'Strong model', 'model', 'Example AI', 'on', 'Planning and review.'),
    tb('fast-model', 'Fast model', 'model', 'Example AI', 'on', 'Routine edits.'),
    tb('local-model', 'Local model', 'model', 'This computer', 'on', 'Free; text only.'),
    tb('route-free', 'Free route', 'route', 'Waypoint', 'on', 'Free pools first.'),
    tb('mcp-files', 'File system MCP', 'mcp', 'Open source', 'on', 'Read and write project files.'),
    tb('mcp-browser', 'Browser MCP', 'mcp', 'Open source', 'unknown', 'Needs approval before first use.'),
    tb('git-cli', 'git', 'cli', 'Open source', 'on', 'Version control.'),
    tb('gh-cli', 'GitHub CLI', 'cli', 'GitHub', 'off', 'Turned off until a token is set.'),
    tb('pandoc', 'pandoc', 'tool', 'Open source', 'on', 'Document conversion.'),
    tb('python-rt', 'Python 3.12', 'skill-runtime', 'Open source', 'on', 'Runs skill scripts.')
  ]
};

// ---------------------------------------------------------------- brain (knowledge graph)
const clusters = { preference: ['Writing', 'Agents', 'Cost', 'Design'], brain: ['Projects', 'Decisions'], skill: ['Skills'], instruction: ['Setup'] };
const words = {
  preference: ['Short status lines', 'Free agents first', 'Check before code', 'Plain labels', 'Dark mode works', 'One tab per job', 'Small commits', 'Receipts stay short',
    'Ask once, then act', 'No silent retries', 'Cheapest passing model', 'Read before publish', 'Fix the root cause', 'Neutral demo data', 'Keep paths relative', 'Tests name the rule',
    'One question at a time', 'Show the reset time', 'Floors protect quota', 'No optimistic writes', 'Calm empty states', 'Two themes always', 'Batch the approvals', 'Archive, do not delete'],
  brain: ['Notes app decisions', 'Sync options compared', 'Docs site outline', 'Pipeline sources', 'Release checklist', 'Model price table', 'Weekly review', 'Agent roles'],
  skill: ['project-orchestrator', 'waypoint-worker', 'waypoint-planning', 'learn', 'context-budget', 'code-review'],
  instruction: ['Shared instructions', 'Project setup', 'Install steps']
};
const nodes = [];
for (const kind of ['preference', 'brain', 'skill', 'instruction']) {
  words[kind].forEach((title, i) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cl = clusters[kind][i % clusters[kind].length];
    nodes.push({ id: kind + ':' + slug, kind, title, cluster: cl, brightness: Math.round((1 - (i % 7) / 9) * 100) / 100,
      path: (kind === 'skill' ? 'skills/' + slug + '/SKILL.md' : kind === 'instruction' ? 'instructions/' + slug + '.md' : kind === 'brain' ? 'notes/' + slug + '.md' : 'preferences/' + slug + '.md') });
  });
}
// Deterministic links: each node links to two earlier ones; skills cite preferences; notes are related.
const links = [];
const kinds = ['link', 'related', 'cites', 'supersedes'];
let seed = 7;
const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
nodes.forEach((n, i) => {
  if (i === 0) return;
  const k = n.kind === 'skill' ? 'cites' : n.kind === 'brain' ? 'related' : 'link';
  const a = rnd(i), b = rnd(i);
  links.push([i, a, k]);
  if (b !== a) links.push([i, b, kinds[rnd(kinds.length)]]);
});
const counts = {};
nodes.forEach(n => { counts[n.kind] = (counts[n.kind] || 0) + 1; });
calls.brain_read = { built_at: '@now-40m', counts, truncated: false, nodes, links };

// ---------------------------------------------------------------- learn
const prop = (id, text, premises, due, reps) => ({ id, topic: 'git-basics', text, premises, session: '2026-11-07', created_at: '@now-2d',
  practice: { due, interval_days: reps ? 2 : 0, ease: 2.5, reps, last_outcome: reps ? 'good' : null } });
const props = [
  prop('p1', 'A commit is a saved snapshot of the staged files, with a message and a parent.', [], '@now-6h', 1),
  prop('p2', 'A branch is a movable name that points at one commit.', ['p1'], '@now-2h', 1),
  prop('p3', 'New commits move the current branch forward; other branches stay put.', ['p2'], '@now+1d', 2),
  prop('p4', 'git fetch downloads commits; git pull is fetch followed by a merge.', ['p1'], '@now-30m', 0),
  prop('p5', 'Revert, not reset, undoes a commit that is already pushed.', ['p3', 'p4'], '@now+3d', 2)
];
calls.learn_read = {
  topics: [
    { id: 'git-basics', title: 'Git basics', goal: 'Use branches, merges and remotes without fear.', status: 'active', start: 'Knows commit and push; unsure about branches.',
      steps: [
        { id: 'repo', title: 'What a repository is', deps: [], status: 'taught' },
        { id: 'commit', title: 'Stage and commit changes', deps: ['repo'], status: 'taught' },
        { id: 'branch', title: 'Work on a branch', deps: ['commit'], status: 'taught' },
        { id: 'merge', title: 'Merge a branch back', deps: ['branch'], status: 'repair', note: 'Mixed up the two sides of a conflict.' },
        { id: 'remote', title: 'Push and pull with a remote', deps: ['commit'], status: 'todo' },
        { id: 'undo', title: 'Undo safely', deps: ['merge', 'remote'], status: 'todo' }
      ] },
    { id: 'sql-joins', title: 'SQL joins', goal: 'Choose the right join and read its result.', status: 'active', start: 'Knows SELECT and WHERE.',
      steps: [
        { id: 'keys', title: 'Keys and rows', deps: [], status: 'taught' },
        { id: 'inner', title: 'Inner join', deps: ['keys'], status: 'todo' },
        { id: 'outer', title: 'Left and full joins', deps: ['inner'], status: 'todo' }
      ] }
  ],
  props,
  links: props.flatMap(p => p.premises.map(q => ({ from: q, to: p.id }))),
  due: ['p1', 'p2', 'p4'].map(id => props.find(p => p.id === id)) // oldest due first
};

calls.dashboard_read = { ok: true };

const features = {
  tools: ['answer', 'board_read', 'brain_read', 'dashboard_read', 'floor_set', 'learn_practice_record', 'learn_prop_add', 'learn_read', 'learn_step_set',
    'learn_topic_set', 'ops_read', 'pref_approve', 'pref_edit', 'pref_list', 'pref_reject', 'todo_tick', 'toggle_set', 'toolbox_read'],
  addons: { preferences: true, brain: true, learn: true, toolbox: true },
  data_dir: '~/waypoint-data'
};

const doc = { _note: 'Neutral demo answers for the Waypoint server in the preview harness. Generated by make_wpc_fixtures.mjs; edit that file, not this one.', features, calls };
writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
console.log('wrote ' + OUT + ' (' + Object.keys(calls).length + ' answers)');
