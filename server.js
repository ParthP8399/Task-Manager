// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { run, get, all, init } = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 4000;

(async () => { await init(); })();

// Helper: normalize status and done check
function normalizeStatus(s) {
  if (!s) return '';
  s = String(s).trim().toLowerCase();
  if (s === 'in progress') s = 'in-progress';
  if (s === 'completed' || s === 'complete') s = 'done';
  if (['todo', 'in-progress', 'done'].includes(s)) return s;
  
  return s;
}
function isDoneStatus(s) {
  return ['done', 'completed', 'complete'].includes((s || '').toString().toLowerCase());
}

// ----------------- Projects -----------------
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, owner_id, deadline, status } = req.body;
    const r = await run(
      `INSERT INTO projects (name,description,owner_id,deadline,status) VALUES (?,?,?,?,?)`,
      [name, description, owner_id || 1, deadline || null, status || 'active']
    );
    const proj = await get(`SELECT * FROM projects WHERE id = ?`, [r.id]);
    res.json(proj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects', async (req, res) => {
  const list = await all(`SELECT * FROM projects ORDER BY id DESC`);
  res.json(list);
});

app.get('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  const p = await get(`SELECT * FROM projects WHERE id = ?`, [id]);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const tasks = await all(`SELECT * FROM tasks WHERE project_id = ?`, [id]);
  res.json({ project: p, tasks });
});

app.put('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  const { name, description, deadline, status } = req.body;
  await run(`UPDATE projects SET name=?,description=?,deadline=?,status=? WHERE id=?`, [name, description, deadline, status, id]);
  const p = await get(`SELECT * FROM projects WHERE id = ?`, [id]);
  res.json(p);
});

app.delete('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  await run(`DELETE FROM task_dependencies WHERE task_id IN (SELECT id FROM tasks WHERE project_id=?) OR depends_on_task_id IN (SELECT id FROM tasks WHERE project_id=?)`, [id,id]);
  await run(`DELETE FROM tasks WHERE project_id=?`, [id]);
  await run(`DELETE FROM projects WHERE id=?`, [id]);
  res.json({ success: true });
});

// ----------------- Tasks -----------------
app.post('/api/projects/:id/tasks', async (req, res) => {
  try {
    const project_id = req.params.id;
    const { title, description, priority, assignee_id, estimated_hours } = req.body;
    const r = await run(
      `INSERT INTO tasks (project_id,title,description,priority,assignee_id,estimated_hours) VALUES (?,?,?,?,?,?)`,
      [project_id, title, description||'', priority||3, assignee_id||null, estimated_hours||0]
    );
    const task = await get(`SELECT * FROM tasks WHERE id = ?`, [r.id]);
    res.json(task);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  const task = await get(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (!task) return res.status(404).json({ error: 'not found' });
  // Include dependency statuses so client can make informed decisions
  const deps = await all(`
    SELECT td.id, td.depends_on_task_id, t.title, t.status
    FROM task_dependencies td
    JOIN tasks t ON t.id = td.depends_on_task_id
    WHERE td.task_id = ?
  `, [id]);
  const blocking = await all(`
    SELECT td.id, td.task_id, t.title, t.status
    FROM task_dependencies td
    JOIN tasks t ON t.id = td.task_id
    WHERE td.depends_on_task_id = ?
  `, [id]);
  res.json({ task, dependencies: deps, blocking });
});

app.put('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  const fields = ['title','description','priority','assignee_id','estimated_hours','status'];
  const updates = [];
  const vals = [];
  for (let f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      vals.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'no fields' });
  vals.push(id);
  await run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, vals);
  const t = await get(`SELECT * FROM tasks WHERE id = ?`, [id]);
  res.json(t);
});

// status update with dependency & transition validation
app.put('/api/tasks/:id/status', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });

  const task = await get(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (!task) return res.status(404).json({ error: 'task not found' });

  const newStatus = normalizeStatus(status);
  const curStatus = normalizeStatus(task.status);

  // Only allow the three canonical statuses for transitions
  if (!['todo','in-progress','done'].includes(newStatus)) {
    return res.status(400).json({ error: 'invalid status. allowed: todo, in-progress, done' });
  }

  // Rules:
  // 1) To move to 'in-progress', all dependencies must be complete.
  // 2) To move to 'done', current status MUST be 'in-progress' (i.e., can't jump todo -> done).
  // 3) When moving to 'done', re-check dependencies are complete (defense in depth).
  if (newStatus === 'in-progress') {
    // check dependencies
    const deps = await all(`
      SELECT t.* FROM task_dependencies td JOIN tasks t ON t.id = td.depends_on_task_id WHERE td.task_id = ?
    `, [id]);
    const incomplete = deps.filter(d => !isDoneStatus(d.status));
    if (incomplete.length > 0) {
      return res.status(400).json({ error: 'Cannot move to in-progress â€” blocked by incomplete dependencies', blocked_by: incomplete });
    }
  }

  if (newStatus === 'done') {
    // must come from in-progress
    if (curStatus !== 'in-progress') {
      return res.status(400).json({ error: 'Task must be in "in-progress" before it can be marked done' });
    }
    // re-check dependencies
    const deps = await all(`
      SELECT t.* FROM task_dependencies td JOIN tasks t ON t.id = td.depends_on_task_id WHERE td.task_id = ?
    `, [id]);
    const incomplete = deps.filter(d => !isDoneStatus(d.status));
    if (incomplete.length > 0) {
      return res.status(400).json({ error: 'Blocked by incomplete dependencies', blocked_by: incomplete });
    }
  }

  // allowed transition, update normalized status
  await run(`UPDATE tasks SET status = ? WHERE id = ?`, [newStatus, id]);
  const t = await get(`SELECT * FROM tasks WHERE id = ?`, [id]);
  res.json(t);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  const force = req.query.force === 'true';
  const dependents = await all(`SELECT td.id, td.task_id, t.title FROM task_dependencies td JOIN tasks t ON t.id = td.task_id WHERE td.depends_on_task_id = ?`, [id]);
  if (dependents.length > 0 && !force) {
    return res.status(400).json({ error: 'Task has dependents; cannot delete without force', dependents });
  }
  await run(`DELETE FROM task_dependencies WHERE task_id = ? OR depends_on_task_id = ?`, [id, id]);
  await run(`DELETE FROM tasks WHERE id = ?`, [id]);
  res.json({ success: true });
});

// ----------------- Dependency Management -----------------
async function buildGraph(project_id = null) {
  const deps = project_id
    ? await all(`SELECT * FROM task_dependencies td JOIN tasks t ON t.id = td.task_id WHERE t.project_id = ?`, [project_id])
    : await all(`SELECT * FROM task_dependencies`);
  const adj = {};
  for (const d of deps) {
    const a = d.task_id;
    const b = d.depends_on_task_id;
    if (!adj[a]) adj[a] = new Set();
    adj[a].add(b);
    if (!adj[b]) adj[b] = adj[b] || new Set();
  }
  return adj;
}

async function createsCycle(task_id, depends_on_task_id) {
  const adj = await buildGraph();
  const graph = {};
  for (const k of Object.keys(adj)) graph[k] = Array.from(adj[k]);
  const target = String(task_id);
  const start = String(depends_on_task_id);
  const visited = new Set();
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === target) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const neighbors = (graph[cur] || []);
    for (const n of neighbors) stack.push(String(n));
  }
  return false;
}

app.post('/api/tasks/:id/dependencies', async (req, res) => {
  const task_id = parseInt(req.params.id, 10);
  const { depends_on_task_id } = req.body;
  if (!depends_on_task_id) return res.status(400).json({ error: 'depends_on_task_id required' });
  if (task_id === depends_on_task_id) return res.status(400).json({ error: 'task cannot depend on itself' });

  const t1 = await get(`SELECT * FROM tasks WHERE id = ?`, [task_id]);
  const t2 = await get(`SELECT * FROM tasks WHERE id = ?`, [depends_on_task_id]);
  if (!t1 || !t2) return res.status(404).json({ error: 'task(s) not found' });

  const isCycle = await createsCycle(task_id, depends_on_task_id);
  if (isCycle) return res.status(400).json({ error: 'Adding dependency would create a circular dependency' });

  try {
    const r = await run(`INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?,?)`, [task_id, depends_on_task_id]);
    const dep = await get(`SELECT * FROM task_dependencies WHERE id = ?`, [r.id]);
    res.json(dep);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tasks/:taskId/dependencies/:depId', async (req, res) => {
  const depId = req.params.depId;
  await run(`DELETE FROM task_dependencies WHERE id = ?`, [depId]);
  console.log('Deleted dependency', depId);
  res.json({ success: true });
});

app.get('/api/tasks/:id/dependencies', async (req, res) => {
  const id = req.params.id;
  const deps = await all(`SELECT td.id, td.depends_on_task_id, t.title FROM task_dependencies td JOIN tasks t ON t.id = td.depends_on_task_id WHERE td.task_id = ?`, [id]);
  res.json(deps);
});

app.get('/api/tasks/:id/blocking', async (req, res) => {
  const id = req.params.id;
  const blocks = await all(`SELECT td.id, td.task_id, t.title, t.status FROM task_dependencies td JOIN tasks t ON t.id = td.task_id WHERE td.depends_on_task_id = ?`, [id]);
  res.json(blocks);
});

// ----------------- Analytics -----------------
app.get('/api/projects/:id/progress', async (req, res) => {
  const pid = req.params.id;
  const tasks = await all(`SELECT * FROM tasks WHERE project_id = ?`, [pid]);
  if (tasks.length === 0) return res.json({ percent: 0, total: 0, done: 0 });
  const done = tasks.filter(t => isDoneStatus(t.status)).length;
  const percent = Math.round((done / tasks.length) * 100);
  const blocked = [];
  for (const t of tasks) {
    const deps = await all(`SELECT t.* FROM task_dependencies td JOIN tasks t ON t.id = td.depends_on_task_id WHERE td.task_id = ?`, [t.id]);
    const blockedBy = deps.filter(d => !isDoneStatus(d.status));
    if (blockedBy.length > 0) blocked.push({ task: t, blockedBy });
  }
  res.json({ percent, total: tasks.length, done, blocked });
});

app.get('/api/projects/:id/critical-path', async (req, res) => {
  const pid = req.params.id;
  const tasks = await all(`SELECT id FROM tasks WHERE project_id = ?`, [pid]);
  const ids = tasks.map(t => t.id);
  const adj = {};
  const deps = await all(`
    SELECT td.task_id, td.depends_on_task_id FROM task_dependencies td
    JOIN tasks t ON t.id = td.task_id
    WHERE t.project_id = ?
  `, [pid]);
  for (const d of deps) {
    adj[d.task_id] = adj[d.task_id] || [];
    adj[d.task_id].push(d.depends_on_task_id);
  }
  const memo = {};
  function dfs(u) {
    if (memo[u]) return memo[u];
    const nbrs = adj[u] || [];
    if (nbrs.length === 0) {
      memo[u] = [u];
      return memo[u];
    }
    let best = [];
    for (const v of nbrs) {
      const p = dfs(v);
      if (p.length > best.length) best = p;
    }
    memo[u] = [u, ...best];
    return memo[u];
  }
  let overallBest = [];
  for (const t of ids) {
    const p = dfs(t);
    if (p.length > overallBest.length) overallBest = p;
  }
  const chainDetails = [];
  for (const tid of overallBest) {
    const task = await get(`SELECT * FROM tasks WHERE id = ?`, [tid]);
    chainDetails.push(task);
  }
  res.json({ chain: chainDetails });
});

// Start
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});