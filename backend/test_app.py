import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import uuid
import os
import json
import tempfile
from app import app, Database, Task, TaskCreate, TaskUpdate, TaskMove

client = TestClient(app)


@pytest.fixture
def sample_task():
    return Task(id="test-id", title="Test Task", description="Test description")


@pytest.fixture
def temp_db_file():
    """Create a temporary file for database testing"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        temp_file = f.name

    yield temp_file

    # Cleanup
    if os.path.exists(temp_file):
        os.unlink(temp_file)


@pytest.fixture
def fresh_db(temp_db_file):
    """Create a fresh database instance for testing with temp file"""
    # Create database instance with temporary backup file
    db = Database(backup_file=temp_db_file)
    # Clear any default data and reset state for clean tests
    db._tasks_db.clear()
    db._columns.clear()
    db._has_changes = False

    return db


class TestDatabase:
    def test_database_init(self, temp_db_file):
        """Test database initialization with sample data"""
        db = Database(backup_file=temp_db_file)
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
            "column_id": "test_column",
        }
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Task"
        assert data["description"] == "New task description"
        assert "id" in data

    def test_create_task_without_description(self):
        """Test creating task without description"""
        task_data = {"title": "Task without description", "column_id": "test_column"}
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


class TestBackupFunctionality:
    """Test database backup and restore functionality"""

    def test_export_import_json(self, fresh_db, sample_task):
        """Test JSON export and import functionality"""
        # Add some data
        fresh_db.add(sample_task, "test_column")

        # Export to JSON
        exported_data = fresh_db.export_to_json()
        assert "tasks" in exported_data
        assert "columns" in exported_data
        assert sample_task.id in exported_data["tasks"]
        assert "test_column" in exported_data["columns"]

        # Create fresh database and import
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            new_temp_file = f.name
        try:
            new_db = Database(backup_file=new_temp_file)
            new_db._tasks_db.clear()  # Clear default data
            new_db._columns.clear()
            new_db.import_from_json(exported_data)

            # Verify import worked
            imported_task = new_db.get(sample_task.id)
            assert imported_task.id == sample_task.id
            assert imported_task.title == sample_task.title

            columns = new_db.serialize()
            assert "test_column" in columns
            assert len(columns["test_column"]) == 1
        finally:
            # Cleanup
            if os.path.exists(new_temp_file):
                os.unlink(new_temp_file)

    def test_save_and_load_file(self, fresh_db, sample_task):
        """Test saving to and loading from file"""
        # Add data (this should mark as changed)
        fresh_db.add(sample_task, "test_column")

        # Save to file should return True (changes were made)
        result = fresh_db.save_to_file()
        assert result == True
        assert os.path.exists(fresh_db._backup_file)

        # Verify file contents
        with open(fresh_db._backup_file, "r") as f:
            data = json.load(f)
        assert "tasks" in data
        assert "backup_timestamp" in data
        assert sample_task.id in data["tasks"]

        # Create new database and load
        new_db = Database(backup_file=fresh_db._backup_file)
        # Clear default data before loading
        new_db._tasks_db.clear()
        new_db._columns.clear()
        loaded = new_db.load_from_file()
        assert loaded == True

        # Verify loaded data
        loaded_task = new_db.get(sample_task.id)
        assert loaded_task.id == sample_task.id
        assert loaded_task.title == sample_task.title

    def test_no_save_when_no_changes(self, fresh_db):
        """Test that save_to_file returns False when no changes"""
        # Fresh database with no changes should not save
        result = fresh_db.save_to_file()
        assert result == False

        # After saving once, subsequent saves with no changes should return False
        fresh_db.add(Task(id="test", title="Test"), "test_column")
        fresh_db.save_to_file()  # This should save and clear the changes flag

        # Now saving again should return False (no new changes)
        result = fresh_db.save_to_file()
        assert result == False

    def test_load_nonexistent_file(self):
        """Test loading from non-existent file"""
        db = Database(backup_file="nonexistent_file.json")
        # Clear default data
        db._tasks_db.clear()
        db._columns.clear()
        result = db.load_from_file()
        assert result == False

    def test_change_tracking(self, fresh_db, sample_task):
        """Test that database operations mark changes correctly"""
        # Initially no changes (fresh DB) - save should return False
        result = fresh_db.save_to_file()
        assert result == False

        # Add task should mark changes - save should return True
        fresh_db.add(sample_task, "test")
        result = fresh_db.save_to_file()
        assert result == True

        # No changes after save - should return False
        result = fresh_db.save_to_file()
        assert result == False

        # Move should mark changes - save should return True
        fresh_db.move(sample_task.id, "other", 0)
        result = fresh_db.save_to_file()
        assert result == True

        # Update should mark changes - save should return True
        fresh_db.save_to_file()  # Clear changes flag first
        fresh_db.update_task(sample_task.id, title="Updated")
        result = fresh_db.save_to_file()
        assert result == True

        # Delete should mark changes - save should return True
        fresh_db.save_to_file()  # Clear changes flag first
        fresh_db.delete(sample_task.id)
        result = fresh_db.save_to_file()
        assert result == True
