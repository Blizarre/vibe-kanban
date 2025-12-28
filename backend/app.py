from fastapi import FastAPI, Body, Path, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

if no_cors := os.getenv("DEV_NO_CORS"):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Static file serving for React frontend
frontend_path = os.getenv("STATIC_DIR")


# Pydantic models for request bodies and responses
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    column_id: str
    category_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[str] = None


class TaskMove(BaseModel):
    new_column_id: str
    new_index: int


class Task(BaseModel):  # Model for task representation, e.g., for GET response
    id: str
    title: str
    description: Optional[str] = None
    category_id: Optional[str] = None


# Category models
class Category(BaseModel):
    id: str
    name: str
    color: str


class CategoryCreate(BaseModel):
    name: str
    color: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


# Database with automatic backup functionality
@dataclass
class Database:
    _tasks_db: Dict[str, Task] = None
    _columns: Dict[str, List[Task]] = None
    _categories: Dict[str, Category] = None
    _has_changes: bool = False
    _backup_file: str = None
    _lock: threading.RLock = None

    def add(self, t: Task, column_id: str):
        with self._lock:
            self._tasks_db[t.id] = t
            if column_id not in self._columns:
                self._columns[column_id] = []
            self._columns[column_id].append(t)
            self._mark_changed()

    def get(self, id: str):
        with self._lock:
            return self._tasks_db[id]

    def move(self, id: str, to_column_id: str, to_index: int):
        with self._lock:
            task = self._tasks_db[id]  # Get task directly to avoid nested locking
            for task_list in self._columns.values():
                if task in task_list:
                    task_list.remove(task)
                    break
            if to_column_id not in self._columns:
                self._columns[to_column_id] = []
            self._columns[to_column_id].insert(to_index, task)
            self._mark_changed()

    def serialize(self):
        with self._lock:
            return deepcopy(self._columns)

    def delete(self, task_id: str):
        with self._lock:
            task = self._tasks_db[task_id]  # Will raise KeyError if not found
            del self._tasks_db[task_id]

            for task_list in self._columns.values():
                if task in task_list:
                    task_list.remove(task)
                    break
            self._mark_changed()

    def empty_column(self, column_id: str):
        with self._lock:
            if column_id in self._columns:
                # Delete all tasks in the column from the tasks database
                for task in self._columns[column_id]:
                    del self._tasks_db[task.id]
                # Clear the column
                self._columns[column_id] = []
                self._mark_changed()

    def update_task(self, task_id: str, **kwargs):
        with self._lock:
            task = self._tasks_db[task_id]  # Get task directly to avoid nested locking
            for key, value in kwargs.items():
                setattr(task, key, value)
            self._mark_changed()

    # Category methods
    def add_category(self, category: Category):
        """Add a new category"""
        with self._lock:
            self._categories[category.id] = category
            self._mark_changed()

    def get_category(self, category_id: str) -> Category:
        """Get a category by ID"""
        with self._lock:
            return self._categories[category_id]

    def get_all_categories(self) -> Dict[str, Category]:
        """Get all categories"""
        with self._lock:
            return deepcopy(self._categories)

    def update_category(self, category_id: str, **kwargs):
        """Update category properties"""
        with self._lock:
            category = self._categories[category_id]
            for key, value in kwargs.items():
                if value is not None:
                    setattr(category, key, value)
            self._mark_changed()

    def delete_category(self, category_id: str):
        """Delete a category and set affected tasks to null category"""
        with self._lock:
            if category_id not in self._categories:
                raise KeyError(f"Category {category_id} not found")

            # Set all tasks with this category to null
            for task in self._tasks_db.values():
                if task.category_id == category_id:
                    task.category_id = None

            del self._categories[category_id]
            self._mark_changed()

    def _mark_changed(self):
        self._has_changes = True

    def export_to_json(self) -> dict:
        """Export database state to JSON-serializable format"""
        with self._lock:
            data = {
                "tasks": {
                    task_id: task.model_dump()
                    for task_id, task in self._tasks_db.items()
                },
                "columns": {},
                "categories": {
                    cat_id: cat.model_dump() for cat_id, cat in self._categories.items()
                },
            }
            for column_id, tasks in self._columns.items():
                data["columns"][column_id] = [task.id for task in tasks]
            return data

    def import_from_json(self, data: dict):
        """Import database state from JSON format"""
        with self._lock:
            self._tasks_db.clear()
            self._columns.clear()
            self._categories.clear()

            # Restore tasks (with backward compatibility for category_id)
            for task_id, task_data in data.get("tasks", {}).items():
                # Ensure category_id exists for backward compatibility
                if "category_id" not in task_data:
                    task_data["category_id"] = None
                task = Task(**task_data)
                self._tasks_db[task_id] = task

            # Restore column organization
            for column_id, task_ids in data.get("columns", {}).items():
                self._columns[column_id] = []
                for task_id in task_ids:
                    if task_id in self._tasks_db:
                        self._columns[column_id].append(self._tasks_db[task_id])

            # Restore categories (empty if not present - backward compatibility)
            for cat_id, cat_data in data.get("categories", {}).items():
                self._categories[cat_id] = Category(**cat_data)

    def save_to_file(self):
        """Save database to JSON file if changes have been made"""
        with self._lock:
            if not self._has_changes:
                return False

            try:
                # Export data directly within the lock to avoid nested locking
                data = {
                    "tasks": {
                        task_id: task.model_dump()
                        for task_id, task in self._tasks_db.items()
                    },
                    "columns": {},
                    "categories": {
                        cat_id: cat.model_dump()
                        for cat_id, cat in self._categories.items()
                    },
                }
                for column_id, tasks in self._columns.items():
                    data["columns"][column_id] = [task.id for task in tasks]

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
        with self._lock:
            if not os.path.exists(self._backup_file):
                print(
                    f"No backup file found at {self._backup_file}, using default data"
                )
                return False

            try:
                with open(self._backup_file, "r") as f:
                    data = json.load(f)

                # Import data directly within the lock to avoid nested locking
                self._tasks_db.clear()
                self._columns.clear()
                self._categories.clear()

                # Restore tasks (with backward compatibility for category_id)
                for task_id, task_data in data.get("tasks", {}).items():
                    # Ensure category_id exists for backward compatibility
                    if "category_id" not in task_data:
                        task_data["category_id"] = None
                    task = Task(**task_data)
                    self._tasks_db[task_id] = task

                # Restore column organization
                for column_id, task_ids in data.get("columns", {}).items():
                    self._columns[column_id] = []
                    for task_id in task_ids:
                        if task_id in self._tasks_db:
                            self._columns[column_id].append(self._tasks_db[task_id])

                # Restore categories (empty if not present - backward compatibility)
                for cat_id, cat_data in data.get("categories", {}).items():
                    self._categories[cat_id] = Category(**cat_data)

                backup_time = data.get("backup_timestamp", "unknown")
                print(
                    f"Database restored from {self._backup_file} (backup from {backup_time})"
                )
                self._has_changes = False
                return True
            except Exception as e:
                print(f"Failed to load database: {e}")
                return False

    def __init__(self, backup_file: str = "database.json"):
        self._tasks_db = {}
        self._columns = {}
        self._categories = {}
        self._has_changes = False
        self._backup_file = backup_file
        self._lock = threading.RLock()

        # Try to load from backup file first
        if not self.load_from_file():
            # If no backup exists, create default data
            # Ideas column
            self.add(
                Task(
                    id=str(uuid.uuid4()),
                    title="Ask Claude AI to make Half-Life 3 as an easter egg in the app",
                    description="",
                ),
                "ideas",
            )
            self.add(
                Task(
                    id=str(uuid.uuid4()), title="Make the app web-scale", description=""
                ),
                "ideas",
            )
            self.add(
                Task(
                    id=str(uuid.uuid4()),
                    title="Implement User accounts and Auth/Autz",
                    description="",
                ),
                "ideas",
            )

            # Selected column
            self.add(
                Task(
                    id=str(uuid.uuid4()),
                    title="Re-design the API endpoints",
                    description="",
                ),
                "selected",
            )
            self.add(
                Task(
                    id=str(uuid.uuid4()),
                    title="Holistically administrate exceptional synergies",
                    description="",
                ),
                "selected",
            )

            # In Progress column
            self.add(
                Task(
                    id=str(uuid.uuid4()),
                    title="Update the README with a screenshot",
                    description="",
                ),
                "in_progress",
            )

            # Parked column
            self.add(
                Task(id=str(uuid.uuid4()), title="Take over the world", description=""),
                "parked",
            )
            self.add(
                Task(id=str(uuid.uuid4()), title="Review the code", description=""),
                "parked",
            )

            # Done column
            self.add(
                Task(
                    id=str(uuid.uuid4()), title="Add data persistence", description=""
                ),
                "done",
            )
            self.add(
                Task(
                    id=str(uuid.uuid4()),
                    title="Write Infrastructure scaffolding for deployment",
                    description="",
                ),
                "done",
            )

            self._has_changes = True


# Initialize database with persistent storage
data_dir = os.getenv("DATA_DIR", "")  # Default to current directory for development
backup_file_path = os.path.join(data_dir, "database.json")

db = Database(backup_file=backup_file_path)


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
        category_id=task_data.category_id,
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


@app.delete("/api/columns/{column_id}/empty", status_code=204)
async def empty_column(
    column_id: str = Path(..., description="The ID of the column to empty")
):
    """
    Empties all tasks in a column.
    """
    db.empty_column(column_id)
    return None


# --- Category Endpoints ---


@app.get("/api/categories")
async def get_categories():
    """
    Retrieves all category definitions.
    """
    return db.get_all_categories()


@app.post("/api/categories", status_code=201, response_model=Category)
async def create_category(category_data: CategoryCreate):
    """
    Creates a new category.
    """
    category_id = str(uuid.uuid4())

    new_category = Category(
        id=category_id,
        name=category_data.name,
        color=category_data.color,
    )
    db.add_category(new_category)
    return new_category


@app.put("/api/categories/{category_id}", response_model=Category)
async def update_category_endpoint(
    category_id: str = Path(..., description="The ID of the category to update"),
    category_data: CategoryUpdate = Body(
        ..., description="The updated category details"
    ),
):
    """
    Updates an existing category by its ID.
    """
    try:
        category = db.get_category(category_id)
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f"Category with ID '{category_id}' not found"
        )

    update_data = category_data.model_dump(exclude_unset=True)
    db.update_category(category_id, **update_data)

    return category


@app.delete("/api/categories/{category_id}", status_code=204)
async def delete_category_endpoint(
    category_id: str = Path(..., description="The ID of the category to delete")
):
    """
    Deletes a category by its ID.
    All tasks with this category will be set to no category.
    """
    try:
        db.delete_category(category_id)
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f"Category with ID '{category_id}' not found"
        )

    return None


# Only enable static file serving if STATIC_DIR is configured
if frontend_path:

    @app.get("/")
    async def serve_root():
        """Serve the React app at the root URL."""
        index_path = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        else:
            raise HTTPException(status_code=404, detail="Frontend not found")

    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_path, "assets")),
        name="assets",
    )
