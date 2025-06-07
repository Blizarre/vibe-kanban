from fastapi import FastAPI, Body, Path, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from copy import deepcopy
from dataclasses import dataclass

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

class Task(BaseModel): # Model for task representation, e.g., for GET response
    id: str
    title: str
    description: Optional[str] = None

# Dummy data store for demonstration purposes
# In a real application, this would be replaced with a database.
@dataclass
class Database():
    _tasks_db: Dict[str, Task] = None
    _columns: Dict[str, List[Task]] = None

    def add(self, t: Task, column_id: str):
        self._tasks_db[t.id] = t
        if column_id not in self._columns:
            self._columns[column_id] = []
        self._columns[column_id].append(t)

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

    def serialize(self):
        return deepcopy(self._columns)
    
    def delete(self, task_id: str):
        task = self._tasks_db[task_id]  # Will raise KeyError if not found
        del self._tasks_db[task_id]
        
        for task_list in self._columns.values():
            if task in task_list:
                task_list.remove(task)
                break

    def __init__(self):
        self._tasks_db = {}
        self._columns = {}
        
        task_id1 = str(uuid.uuid4())
        self.add(Task(id=task_id1, title="Plan project", description="Outline phases and resources"), "ideas")
        task_id2 = str(uuid.uuid4())
        self.add(Task(id=task_id2, title="Develop API", description="Implement task endpoints"), "selected")
        task_id3 = str(uuid.uuid4())
        self.add(Task(id=task_id3, title="Develop API2", description="Implement task endpoints"), "selected")

db = Database()

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
    task_data: TaskUpdate = Body(..., description="The updated task details")
):
    """
    Updates an existing task by its ID.
    """
    try:
        task = db.get(task_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found")

    # Update only the fields that are provided in the request body
    update_data = task_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    
    return task

@app.post("/api/tasks/{task_id}/move", response_model=Task)
async def move_task(
    task_id: str = Path(..., description="The ID of the task being moved"),
    move_data: TaskMove = Body(..., description="The new column ID and index")
):
    """
    Moves a task to a new column and updates its order.
    """
    try:
        task = db.get(task_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Task with ID '{task_id}' not found")

    print("Moving task", task_id)
    db.move(task_id, move_data.new_column_id, move_data.new_index)

    return task

# 5. DELETE /api/tasks/{taskId}
@app.delete("/api/tasks/{taskId}", status_code=204) # 204 No Content for successful deletion
async def delete_task(taskId: str = Path(..., description="The ID of the task to delete")):
    """
    Deletes a task by its ID.
    """
    try:
        db.delete(taskId)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Task with ID '{taskId}' not found")
    
    return None
