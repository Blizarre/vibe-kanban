import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import uuid
from app import app, Database, Task, TaskCreate, TaskUpdate, TaskMove

client = TestClient(app)

@pytest.fixture
def sample_task():
    return Task(id="test-id", title="Test Task", description="Test description")

@pytest.fixture
def fresh_db():
    """Create a fresh database instance for testing"""
    return Database()

class TestDatabase:
    def test_database_init(self):
        """Test database initialization with sample data"""
        db = Database()
        columns = db.serialize()
        assert "ideas" in columns
        assert "selected" in columns
        assert len(columns["ideas"]) == 1
        assert len(columns["selected"]) == 2

    def test_add_task(self, fresh_db, sample_task):
        """Test adding a task to database"""
        fresh_db.add(sample_task, "test_column")
        # Verify task was added by trying to get it
        retrieved_task = fresh_db.get(sample_task.id)
        assert retrieved_task == sample_task
        # Verify it's in the correct column
        columns = fresh_db.serialize()
        assert "test_column" in columns
        assert len(columns["test_column"]) == 1

    def test_get_task(self, fresh_db, sample_task):
        """Test getting a task from database"""
        fresh_db.add(sample_task, "test_column")
        result = fresh_db.get(sample_task.id)
        assert result == sample_task

    def test_get_nonexistent_task(self, fresh_db):
        """Test getting a non-existent task raises KeyError"""
        with pytest.raises(KeyError):
            fresh_db.get("nonexistent-id")

    def test_move_task(self, fresh_db, sample_task):
        """Test moving a task between columns"""
        # Add task to source column
        fresh_db.add(sample_task, "source")
        
        # Verify initial state
        columns = fresh_db.serialize()
        assert len(columns["source"]) == 1
        
        # Move task
        fresh_db.move(sample_task.id, "target", 0)
        
        # Verify final state
        columns = fresh_db.serialize()
        assert len(columns.get("source", [])) == 0
        assert len(columns["target"]) == 1
        
        # Verify task is still accessible
        retrieved_task = fresh_db.get(sample_task.id)
        assert retrieved_task == sample_task

    def test_delete_task(self, fresh_db, sample_task):
        """Test deleting a task from database"""
        fresh_db.add(sample_task, "test_column")
        
        # Verify task exists
        retrieved_task = fresh_db.get(sample_task.id)
        assert retrieved_task == sample_task
        
        # Delete task
        fresh_db.delete(sample_task.id)
        
        # Verify task no longer exists
        with pytest.raises(KeyError):
            fresh_db.get(sample_task.id)
        
        # Verify column is empty
        columns = fresh_db.serialize()
        assert len(columns.get("test_column", [])) == 0

    def test_delete_nonexistent_task(self, fresh_db):
        """Test deleting a non-existent task raises KeyError"""
        with pytest.raises(KeyError):
            fresh_db.delete("nonexistent-id")

    def test_serialize(self, fresh_db):
        """Test database serialization"""
        result = fresh_db.serialize()
        assert isinstance(result, dict)
        # Should be a copy, not the original
        fresh_db.add(Task(id="test", title="Test"), "new_column")
        result_after = fresh_db.serialize()
        assert result != result_after

class TestEndpoints:
    def test_get_tasks(self):
        """Test GET /api/tasks endpoint"""
        response = client.get("/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_create_task(self):
        """Test POST /api/tasks endpoint"""
        task_data = {
            "title": "New Task",
            "description": "New task description",
            "column_id": "test_column"
        }
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Task"
        assert data["description"] == "New task description"
        assert "id" in data

    def test_create_task_without_description(self):
        """Test creating task without description"""
        task_data = {
            "title": "Task without description",
            "column_id": "test_column"
        }
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Task without description"
        assert data["description"] is None

    def test_update_task_not_found(self):
        """Test updating non-existent task"""
        task_data = {"title": "Updated Task"}
        response = client.put("/api/tasks/nonexistent-id", json=task_data)
        assert response.status_code == 404

    def test_move_task_not_found(self):
        """Test moving non-existent task"""
        move_data = {"new_column_id": "target", "new_index": 0}
        response = client.post("/api/tasks/nonexistent-id/move", json=move_data)
        assert response.status_code == 404

    def test_delete_task_not_found(self):
        """Test deleting non-existent task"""
        response = client.delete("/api/tasks/nonexistent-id")
        assert response.status_code == 404

class TestIntegration:
    """Integration tests for the complete functionality"""
    
    def test_full_task_workflow(self):
        """Test creating, updating, moving, and deleting a task"""
        # Create a task
        task_data = {"title": "Integration Test Task", "column_id": "todo"}
        create_response = client.post("/api/tasks", json=task_data)
        assert create_response.status_code == 201
        task_id = create_response.json()["id"]
        
        # Update the task
        update_data = {"title": "Updated Task", "description": "Updated description"}
        update_response = client.put(f"/api/tasks/{task_id}", json=update_data)
        assert update_response.status_code == 200
        assert update_response.json()["title"] == "Updated Task"
        
        # Move the task
        move_data = {"new_column_id": "done", "new_index": 0}
        move_response = client.post(f"/api/tasks/{task_id}/move", json=move_data)
        assert move_response.status_code == 200
        
        # Delete the task
        delete_response = client.delete(f"/api/tasks/{task_id}")
        assert delete_response.status_code == 204