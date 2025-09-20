# 📌 Task Manager with Dependencies

A project management system where tasks can have dependencies on other tasks, preventing completion until all dependencies are resolved.  
Includes Kanban board UI + dependency graph.

---

## ⚡ Features
- Manage Projects & Tasks
- Task Dependencies (blocked / blocking relationships)
- Validation (no circular dependencies, enforce task flow)
- Analytics: Project Progress & Critical Path
- SQLite3 persistence
- Express.js REST API

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or later)
- npm
- SQLite3

### Steps
1. Clone the repo:
   ```bash
   git clone <your-repo-url>
   cd task-manager

2. Install dependencies:

	```bash
	npm install
 	node server.js
	
Runs at: http://localhost:4000/


# 📖 API Documentation

Base URL:  
http://localhost:4000

### 1️⃣ Projects
<details>
<summary>📁 Project Endpoints</summary>

- **Create Project** → `POST /projects`  
  ```json
  {
    "name": "My Project",
    "description": "Testing dependencies",
    "owner_id": 1,
    "deadline": "2025-12-31",
    "status": "active"
  }
Get All Projects → GET /projects

Get Project by ID → GET /projects/:id

Update Project → PUT /projects/:id

Delete Project → DELETE /projects/:id

</details>


### 2️⃣ Tasks
<details>
<summary>📝 Task Endpoints</summary>

- **Create Task** → `POST /projects/:id/tasks`  
  ```json
		{
  		"title": "Task 1",
  		"description": "Sample",
  		"priority": 2,
  		"assignee_id": 10,
  		"estimated_hours": 5
		}


Get Task (with deps + blocking) → GET /tasks/:id

Update Task → PUT /tasks/:id

Update Task Status → PUT /tasks/:id/status

Rules:

Must follow todo → in-progress → done

Dependencies must be done before moving to in-progress

Cannot skip states

Delete Task → DELETE /tasks/:id?force=true

</details>


### 3️⃣ Dependencies
<details>
<summary>🔗 Dependency Endpoints</summary>

Add Dependency → POST /tasks/:id/dependencies

{ "depends_on_task_id": 7 }


Rules:

No self-dependency

No circular chains

Remove Dependency → DELETE /tasks/:taskId/dependencies/:depId

Get Dependencies → GET /tasks/:id/dependencies

Get Blocking Tasks → GET /tasks/:id/blocking

</details>
4️⃣ Analytics
<details>
<summary>📊 Analytics Endpoints</summary>

Project Progress → GET /projects/:id/progress

{
  "percent": 50,
  "total": 10,
  "done": 5,
  "blocked": [
    { "task": { ... }, "blockedBy": [ { ... } ] }
  ]
}


Critical Path → GET /projects/:id/critical-path

{
  "chain": [
    { "id": 1, "title": "Task A" },
    { "id": 2, "title": "Task B" }
  ]
}

</details>

