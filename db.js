// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.join(__dirname, 'task-manager.db');
const db = new sqlite3.Database(dbFile);

function run(sql, params = []) {
  return new Promise((res, rej) => {
    db.run(sql, params, function(err) {
      if (err) rej(err);
      else res({ id: this.lastID, changes: this.changes });
    });
  });
}
function get(sql, params = []) {
  return new Promise((res, rej) => {
    db.get(sql, params, (err, row) => {
      if (err) rej(err);
      else res(row);
    });
  });
}
function all(sql, params = []) {
  return new Promise((res, rej) => {
    db.all(sql, params, (err, rows) => {
      if (err) rej(err);
      else res(rows);
    });
  });
}


//Promises
// .this then then

async function init() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      role TEXT
    );
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      owner_id INTEGER,
      deadline TEXT,
      status TEXT DEFAULT 'active',
      FOREIGN KEY(owner_id) REFERENCES users(id)
    );
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority INTEGER DEFAULT 3,
      assignee_id INTEGER,
      estimated_hours INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(assignee_id) REFERENCES users(id)
    );
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      depends_on_task_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id),
      UNIQUE (task_id, depends_on_task_id)
    );
  `);

  // seed a default user for demo
  const user = await get(`SELECT * FROM users WHERE email = ?`, ['demo@local']);
  if (!user) {
    await run(`INSERT INTO users (name,email,role) VALUES (?,?,?)`, ['Demo User','demo@local','developer']);
  }
}

module.exports = { db, run, get, all, init };