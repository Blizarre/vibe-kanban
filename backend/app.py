from fastapi import FastAPI, Body, Path, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from copy import deepcopy
from dataclasses import dataclass
import json
import os
from datetime import datetime
import threading
from time import sleep

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

# Configure CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)


# Pydantic models for request bodies and responses
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    column_id: str


class TaskUpdate(BaseModel):
    title: str
    description: Optional[str] = None


class TaskMove(BaseModel):
    new_column_id: str
    new_index: int


class Task(BaseModel):  # Model for task representation, e.g., for GET response
    id: str
    title: str
    description: Optional[str] = None


# Database with automatic backup functionality
@dataclass
class Database:
    _tasks_db: Dict[str, Task] = None
    _columns: Dict[str, List[Task]] = None
    _has_changes: bool = False
    _backup_file: str = "database.json"

    def add(self, t: Task, column_id: str):
        self._tasks_db[t.id] = t
        if column_id not in self._columns:
            self._columns[column_id] = []
        self._columns[column_id].append(t)
        self._mark_changed()

    def get(self, id: str):
        return self._tasks_db[id]

    def move(self, id: str, to_column_id: str, to_index: int):
        task = self.get(id)
        for task_list in self._columns.values():
            if task in task_list:
                task_list.remove(task)
                break
        if to_column_id not in self._columns:
            self._columns[to_column_id] = []
        self._columns[to_column_id].insert(to_index, task)
        self._mark_changed()

    def serialize(self):
        return deepcopy(self._columns)

    def delete(self, task_id: str):
        task = self._tasks_db[task_id]  # Will raise KeyError if not found
        del self._tasks_db[task_id]

        for task_list in self._columns.values():
            if task in task_list:
                task_list.remove(task)
                break
        self._mark_changed()

    def update_task(self, task_id: str, **kwargs):
        task = self.get(task_id)
        for key, value in kwargs.items():
            setattr(task, key, value)
        self._mark_changed()

    def _mark_changed(self):
        self._has_changes = True

    def export_to_json(self) -> dict:
        """Export database state to JSON-serializable format"""
        data = {
            "tasks": {
                task_id: task.model_dump() for task_id, task in self._tasks_db.items()
            },
            "columns": {},
        }
        for column_id, tasks in self._columns.items():
            data["columns"][column_id] = [task.id for task in tasks]
        return data

    def import_from_json(self, data: dict):
        """Import database state from JSON format"""
        self._tasks_db.clear()
        self._columns.clear()

        # Restore tasks
        for task_id, task_data in data.get("tasks", {}).items():
            task = Task(**task_data)
            self._tasks_db[task_id] = task

        # Restore column organization
        for column_id, task_ids in data.get("columns", {}).items():
            self._columns[column_id] = []
            for task_id in task_ids:
                if task_id in self._tasks_db:
                    self._columns[column_id].append(self._tasks_db[task_id])

    def save_to_file(self):
        """Save database to JSON file if changes have been made"""
        if not self._has_changes:
            return False

        try:
            data = self.export_to_json()
            data["backup_timestamp"] = datetime.now().isoformat()

            with open(self._backup_file, "w") as f:
                json.dump(data, f, indent=2)

            self._has_changes = False
            print(f"Database backed up to {self._backup_file}")
            return True
        except Exception as e:
            print(f"Failed to save database: {e}")
            return False

    def load_from_file(self):
        """Load database from JSON file if it exists"""
        if not os.path.exists(self._backup_file):
            print(f"No backup file found at {self._backup_file}, using default data")
            return False

        try:
            with open(self._backup_file, "r") as f:
                data = json.load(f)

            self.import_from_json(data)
            backup_time = data.get("backup_timestamp", "unknown")
            print(
                f"Database restored from {self._backup_file} (backup from {backup_time})"
            )
            self._has_changes = False
            return True
        except Exception as e:
            print(f"Failed to load database: {e}")
            return False

    def __init__(self):
        self._tasks_db = {}
        self._columns = {}
        self._has_changes = False

        # Try to load from backup file first
        if not self.load_from_file():
            # If no backup exists, create default data
            task_id1 = str(uuid.uuid4())
            self.add(
                Task(
                    id=task_id1,
                    title="Plan project",
                    description="Outline phases and resources",
                ),
                "ideas",
            )
            task_id2 = str(uuid.uuid4())
            self.add(
                Task(
                    id=task_id2,
                    title="Develop API",
                    description="Implement task endpoints",
                ),
                "selected",
            )
            task_id3 = str(uuid.uuid4())
            self.add(
                Task(
                    id=task_id3,
                    title="Develop API2",
                    description="Implement task endpoints",
                ),
                "selected",
            )
            self._has_changes = True


db = Database()


# Periodic backup system
def periodic_backup():
    """Function to run periodic backups every minute"""
    while True:
        try:
            db.save_to_file()
        except Exception as e:
            print(f"Periodic backup failed: {e}")
        sleep(60)  # Wait for 60 seconds


# Start the backup thread
backup_thread = threading.Thread(target=periodic_backup, daemon=True)
backup_thread.start()

# --- Endpoints Implementation ---


@app.get("/api/tasks")
async def get_tasks():
    """
    Retrieves all tasks organized by columns.
    In a real application, this would fetch tasks from a database.
    """
    return db.serialize()


@app.post("/api/tasks", status_code=201, response_model=Task)
async def create_task(task_data: TaskCreate):
    """
    Creates a new task.
    """
    task_id = str(uuid.uuid4())

    new_task = Task(
        id=task_id,
        title=task_data.title,
        description=task_data.description,
    )
    db.add(new_task, task_data.column_id)
    return new_task


@app.put("/api/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str = Path(..., description="The ID of the task to update"),
    task_data: TaskUpdate = Body(..., description="The updated task details"),
):
    """
    Updates an existing task by its ID.
    """
    try:
        task = db.get(task_id)
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f"Task with ID '{task_id}' not found"
        )

    # Update only the fields that are provided in the request body
    update_data = task_data.model_dump(exclude_unset=True)
    db.update_task(task_id, **update_data)

    return task


@app.post("/api/tasks/{task_id}/move", response_model=Task)
async def move_task(
    task_id: str = Path(..., description="The ID of the task being moved"),
    move_data: TaskMove = Body(..., description="The new column ID and index"),
):
    """
    Moves a task to a new column and updates its order.
    """
    try:
        task = db.get(task_id)
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f"Task with ID '{task_id}' not found"
        )

    print("Moving task", task_id)
    db.move(task_id, move_data.new_column_id, move_data.new_index)

    return task


# 5. DELETE /api/tasks/{taskId}
@app.delete(
    "/api/tasks/{taskId}", status_code=204
)  # 204 No Content for successful deletion
async def delete_task(
    taskId: str = Path(..., description="The ID of the task to delete")
):
    """
    Deletes a task by its ID.
    """
    try:
        db.delete(taskId)
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f"Task with ID '{taskId}' not found"
        )

    return None
