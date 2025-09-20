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
http://localhost:4000/api

### 1️⃣ Projects
<details>
<summary>📁 Project Endpoints</summary>

- **Create Project** → `POST /projects`
- Body:
  ```json
  	{
  	"name": "My Project",
  	"description": "Testing dependencies",
  	"owner_id": 1,
  	"deadline": "2025-12-31",
  	"status": "active"
	}

- Response:
  ```json
  {
    "name": "My Project",
    "description": "Testing dependencies",
    "owner_id": 1,
    "deadline": "2025-12-31",
    "status": "active"
  }

- **Get All Projects** → GET /projects
- Response:
   ```json
  	{
    "id": 1,
    "name": "My Project",
    "description": "Testing dependencies",
    "owner_id": 1,
    "deadline": "2025-12-31",
    "status": "active"
  	}


- **Get Project by ID** → GET /projects/:id
- Response:
	```json
	{
  "project": {
    "id": 1,
    "name": "My Project",
    "description": "Testing dependencies",
    "owner_id": 1,
    "deadline": "2025-12-31",
    "status": "active"
  },
  "tasks": [
    {
      "id": 1,
      "project_id": 1,
      "title": "Task A",
      "description": "",
      "status": "todo",
      "priority": 3,
      "assignee_id": 1,
      "estimated_hours": 5,
      "created_at": "2025-09-20 18:00:00"
    }
  ]
	}


- **Update Project** → PUT /projects/:id
- Body:
	```json
	{
  "name": "My Project Updated",
  "description": "Updated description",
  "deadline": "2025-12-15",
  "status": "active"
	}

 - Response:
	```json
	{
  "id": 1,
  "name": "My Project Updated",
  "description": "Updated description",
  "owner_id": 1,
  "deadline": "2025-12-15",
  "status": "active"
	}


- **Delete Project** → DELETE /projects/:id
- Response:
	```json
	{
  	"success": true
	}

</details>


### 2️⃣ Tasks
<details>
<summary>📝 Task Endpoints</summary>

- **Create Task** → `POST /projects/:id/tasks`  
- Body:
	```json
	{
  	"title": "Design Homepage",
  	"description": "Create wireframes",
  	"priority": 2,
  	"assignee_id": 1,
  	"estimated_hours": 8
	}

- Response:
	```json
	{
  	"id": 1,
  	"project_id": 1,
  	"title": "Design Homepage",
  	"description": "Create wireframes",
  	"status": "todo",
  	"priority": 2,
  	"assignee_id": 1,
  	"estimated_hours": 8,
  	"created_at": "2025-09-20 18:00:00"
	}


- **Get Task** → GET /tasks/:id
- Response:
	``json
	{
  	"task": {
  	"id": 1,
    "project_id": 1,
    "title": "Design Homepage",
    "description": "Create wireframes",
    "status": "todo",
    "priority": 2,
    "assignee_id": 1,
    "estimated_hours": 8,
    "created_at": "2025-09-20 18:00:00"
  	},
  "dependencies": [
    {
      "id": 2,
      "depends_on_task_id": 5,
      "title": "Requirement Analysis",
      "status": "done"
    }
  ],
  "blocking": [
    {
      "id": 3,
      "task_id": 4,
      "title": "Homepage Approval",
      "status": "todo"
    }
  ]
  }


- **Update Task** → PUT /tasks/:id
- Body:
	```json
	{
  	"title": "Design Homepage v2",
  	"priority": 1
	}

- Response:
	```json
	{
  "id": 1,
  "project_id": 1,
  "title": "Design Homepage v2",
  "description": "Create wireframes",
  "status": "todo",
  "priority": 1,
  "assignee_id": 1,
  "estimated_hours": 8,
  "created_at": "2025-09-20 18:00:00"
	}


- **Update Task Status** → PUT /tasks/:id/status
- Body:
  ```json
	{
  "status": "in-progress"
	}


- Response:
  ```json
	{
  "id": 1,
  "project_id": 1,
  "title": "Design Homepage",
  "description": "Create wireframes",
  "status": "in-progress",
  "priority": 2,
  "assignee_id": 1,
  "estimated_hours": 8,
  "created_at": "2025-09-20 18:00:00"
	}


- Error Example (dependencies incomplete):
	```json
	{
  	"error": "Cannot move to in-progress — blocked by incomplete dependencies",
  	"blocked_by": [
    { "id": 2, "title": "Requirement Analysis", "status": "todo" }
  	]
	}


- **Delete Task** → DELETE /tasks/:id?force=true
- Response:
  ```json
	{
  	"success": true
	}
</details>


### 3️⃣ Dependencies
<details>
<summary>🔗 Dependency Endpoints</summary>

- **Add Dependency** → `POST /tasks/:id/dependencies`  
- Body:
	```json
	{
  	"depends_on_task_id": 2
	}


- Response:
	```json
	{
  	"id": 1,
  	"task_id": 1,
  	"depends_on_task_id": 2,
  	"created_at": "2025-09-20 18:00:00"
	}


- **Delete Dependency** → DELETE /tasks/:taskId/dependencies/:depId
- Response:
	```json
	{
  	"success": true
	}


- **Get Task Dependencies** → GET /tasks/:id/dependencies
- Response:
	```json
	{
    	"id": 1,
    	"depends_on_task_id": 2,
    	"title": "Requirement Analysis"
  	}



- **Get Blocking Tasks** → GET /tasks/:id/blocking
- Response:
  ```json
  {
    "id": 3,
    "task_id": 4,
    "title": "Homepage Approval",
    "status": "todo"
  }


</details>

### 4️⃣ Analytics
<details>
<summary>📊 Analytics Endpoints</summary>

- **Project Progress** → `GET /projects/:id/progress`  
  ```json
  	{
  		"percent": 50,
  		"total": 10,
  		"done": 5,
  		"blocked": [
    	{ "task": { ... }, "blockedBy": [ { ... } ] }
  			]
	}



- **Critical Path** → `GET /projects/:id/critical-path`  
  ```json
	{
  		"chain": [
  			{ "id": 1, "title": "Task A" },
    		{ "id": 2, "title": "Task B" }
  			]
	}

</details>

