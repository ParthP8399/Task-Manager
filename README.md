# 📌 Task Manager with Dependencies

A project management system where tasks can have dependencies on other tasks, preventing completion until all dependencies are resolved.  

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


# 📖 Architecture
![High-Level Design (HLD) Diagram](https://github.com/ParthP8399/Task-Manager/blob/main/images/arch_diagram.png)
- Architecture Notes:
1. **Dependency Management & Cycle Prevention**
	- Dependencies are modeled as a directed graph using a junction table.
		```sql
		CREATE TABLE task_dependencies (
    	id INTEGER PRIMARY KEY AUTOINCREMENT,
   	 	task_id INTEGER,                -- The task that has a dependency
    	depends_on_task_id INTEGER,     -- The task it depends on
    	FOREIGN KEY (task_id) REFERENCES tasks(id),
    	FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id),
    	UNIQUE (task_id, depends_on_task_id) -- Prevents duplicate links
		);
	- This structure allows a task to have multiple dependencies (e.g., Task C depends on Task A and Task B).

	- Cycle Detection Algorithm: Before adding a new dependency (POST /api/tasks/:id/dependencies), the backend checks if it would create a circular dependency (e.g., A → B → A). This is critical to prevent 				deadlocks where tasks can never be completed.
	- Algorithm Used: Depth-First Search (DFS)

	- Implementation: The createsCycle(task_id, depends_on_task_id) function:

	- Builds an adjacency list representation of the entire current dependency graph.

	- Initiates a DFS starting from the proposed new dependency (depends_on_task_id).
	- Searches for a path back to the original task (task_id).
	- If a path is found, the request is rejected with a 400 Bad Request error, preventing the cycle.

2. **State Transition Validation**
	- Task status changes (PUT /api/tasks/:id/status) are not simple updates; they are state transitions governed by strict business rules.
	- Validation Rules: The backend enforces a state machine to ensure logical progression:
	- To in-progress:
		- Prerequisite: All of the task's dependencies must have a done status.
		- Logic: The API queries all dependencies and filters for incomplete ones. If any are found, the transition is blocked, and the list of blocking tasks is returned to the client.

	- To done:
		- Prerequisite 1: The task must currently be in the in-progress state. This prevents jumping directly from todo to done.
		- Prerequisite 2: (Redundant safety check) All dependencies must be done.

	- Logic: This two-step rule ensures tasks are worked on and provides a final check before completion.

	- Normalization:
		- The normalizeStatus(s) helper function ensures robust comparisons by converting various user inputs ('completed', 'Complete', 'in progress') into three canonical states: todo, in-progress, done.

3. **Critical Path Analysis**
	- The GET /api/projects/:id/critical-path endpoint calculates the longest path of dependent tasks within a project, which determines the project's minimum possible completion time.
	- Algorithm Used: Depth-First Search (DFS) with Memoization

4. **Safe Deletion Handling**
	- The DELETE /api/tasks/:id endpoint implements a confirmation mechanism for tasks that have dependents.
	- Check: Before deletion, it queries for any other tasks that depend on the task-to-be-deleted.
	- Force Flag: If dependents are found, the deletion is aborted unless the ?force=true query parameter is provided. This explicit "force" flag requires the client to acknowledge the potentially breaking 							change.
	- Cascading Deletes: When a task is deleted (forced or not), all its associated dependency records are also removed to maintain referential integrity

#  AI Usage Details
	- Used AI tools to assist with frontend implementation (UI structure and styling suggestions).
 	- Leveraged AI for debugging support and resolving  errors.
  	- Referred to AI for syntax corrections and code snippets to speed up development.


