from fastapi import FastAPI

app = FastAPI()

from fastapi import FastAPI, Body, Path, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid

from fastapi.middleware.cors import CORSMiddleware

# Configure CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)


# Dummy data store for demonstration purposes
# In a real application, this would be replaced with a database.
tasks_db = {}

# Pydantic models for request bodies and responses
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    column_id: str

class TaskUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    column_id: Optional[str] = None
    task_order: Optional[int] = None

class TaskMove(BaseModel):
    new_column_id: str
    new_index: int

class Task(BaseModel): # Model for task representation, e.g., for GET response
    id: str
    title: str
    description: Optional[str] = None
    column_id: str
    task_order: int


# --- Endpoints Implementation ---

# 1. GET /api/tasks
@app.get("/api/tasks", response_model=List[Task])
async def get_tasks():
    """
    Retrieves a list of all tasks.
    In a real application, this would fetch tasks from a database.
    """
    if not tasks_db:
        # Populate with some initial dummy data if store is empty
        task_id1 = str(uuid.uuid4())
        tasks_db[task_id1] = Task(id=task_id1, title="Plan project", description="Outline phases and resources", column_id="ideas", task_order=0)
        task_id2 = str(uuid.uuid4())
        tasks_db[task_id2] = Task(id=task_id2, title="Develop API", description="Implement task endpoints", column_id="selected", task_order=0)
        task_id3 = str(uuid.uuid4())
        tasks_db[task_id3] = Task(id=task_id3, title="Develop API2", description="Implement task endpoints", column_id="selected", task_order=1)
    return list(tasks_db.values())

# 2. POST /api/tasks
@app.post("/api/tasks", status_code=201, response_model=Task)
async def create_task(task_data: TaskCreate):
    """
    Creates a new task.
    """
    task_id = str(uuid.uuid4())
    
    # Assign a dummy task_order for the new task based on existing tasks in the column
    # In a real app, this logic would be more sophisticated (e.g., using a sequence number)
    current_tasks_in_column = [t for t in tasks_db.values() if t.column_id == task_data.column_id]
    task_order = len(current_tasks_in_column)

    new_task = Task(
        id=task_id,
        title=task_data.title,
        description=task_data.description,
        column_id=task_data.column_id,
        task_order=task_order
    )
    tasks_db[task_id] = new_task
    return new_task

# 3. PUT /api/tasks/{taskId}
@app.put("/api/tasks/{taskId}", response_model=Task)
async def update_task(
    taskId: str = Path(..., description="The ID of the task to update"),
    task_data: TaskUpdate = Body(..., description="The updated task details")
):
    """
    Updates an existing task by its ID.
    """
    if taskId not in tasks_db:
        raise HTTPException(status_code=404, detail=f"Task with ID '{taskId}' not found")

    current_task = tasks_db[taskId]
    
    # Update only the fields that are provided in the request body
    update_data = task_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_task, key, value)
    
    tasks_db[taskId] = current_task # Re-assign to ensure dictionary entry is updated

    return current_task

# 4. PUT /api/tasks/{taskId}/move
@app.put("/api/tasks/{taskId}/move", response_model=Task)
async def move_task(
    taskId: str = Path(..., description="The ID of the task being moved"),
    move_data: TaskMove = Body(..., description="The new column ID and task order")
):
    """
    Moves a task to a new column and updates its order.
    """
    if taskId not in tasks_db:
        raise HTTPException(status_code=404, detail=f"Task with ID '{taskId}' not found")

    current_task = tasks_db[taskId]
    current_task.column_id = move_data.new_column_id

    tasks_in_column = sorted([task for task in tasks_db.values() if task.column_id == move_data.new_column_id], key=lambda t: t.task_order)

    print("Moving task", taskId)

    if move_data.new_index < 0:
        new_index = 0
    elif move_data.new_index >= len(tasks_in_column):
        new_index = len(tasks_in_column)
    else:
        new_index = move_data.new_index
    print("new index", new_index)

    for index in range(0, new_index):
        tasks_in_column[index].task_order = index
    for index in range(new_index, len(tasks_in_column)):
        tasks_in_column[index].task_order = index + 1
    current_task.task_order = new_index

    return current_task

# 5. DELETE /api/tasks/{taskId}
@app.delete("/api/tasks/{taskId}", status_code=204) # 204 No Content for successful deletion
async def delete_task(taskId: str = Path(..., description="The ID of the task to delete")):
    """
    Deletes a task by its ID.
    """
    if taskId not in tasks_db:
        raise HTTPException(status_code=404, detail=f"Task with ID '{taskId}' not found")

    del tasks_db[taskId]
    # FastAPI automatically returns 204 No Content for functions that don't return anything
    # and are decorated with status_code=204. Explicitly returning nothing is also fine.
    return None
