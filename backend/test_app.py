import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import uuid
import os
import json
import tempfile
from app import app, Database, Task, TaskCreate, TaskUpdate, TaskMove, Category

client = TestClient(app)


@pytest.fixture
def sample_task():
    return Task(id="test-id", title="Test Task", description="Test description")


@pytest.fixture
def sample_category():
    return Category(id="cat-id", name="Bug", color="bg-red-500")


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
    db._categories.clear()
    db._has_changes = False

    return db


class TestDatabase:
    def test_database_init(self, temp_db_file):
        """Test database initialization with sample data"""
        db = Database(backup_file=temp_db_file)
        columns = db.serialize()
        assert "ideas" in columns
        assert "selected" in columns
        assert "in_progress" in columns
        assert "parked" in columns
        assert "done" in columns
        assert len(columns["ideas"]) == 3
        assert len(columns["selected"]) == 2
        assert len(columns["in_progress"]) == 1
        assert len(columns["parked"]) == 2
        assert len(columns["done"]) == 2

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


class TestCategoryDatabase:
    """Test category operations on Database class"""

    def test_add_category(self, fresh_db, sample_category):
        """Test adding a category to database"""
        fresh_db.add_category(sample_category)
        retrieved = fresh_db.get_category(sample_category.id)
        assert retrieved.id == sample_category.id
        assert retrieved.name == sample_category.name
        assert retrieved.color == sample_category.color

    def test_get_all_categories(self, fresh_db, sample_category):
        """Test getting all categories"""
        fresh_db.add_category(sample_category)
        second_cat = Category(id="cat-2", name="Feature", color="bg-green-500")
        fresh_db.add_category(second_cat)

        categories = fresh_db.get_all_categories()
        assert len(categories) == 2
        assert sample_category.id in categories
        assert second_cat.id in categories

    def test_get_nonexistent_category(self, fresh_db):
        """Test getting a non-existent category raises KeyError"""
        with pytest.raises(KeyError):
            fresh_db.get_category("nonexistent-id")

    def test_update_category(self, fresh_db, sample_category):
        """Test updating a category"""
        fresh_db.add_category(sample_category)
        fresh_db.update_category(
            sample_category.id, name="Critical Bug", color="bg-red-600"
        )

        updated = fresh_db.get_category(sample_category.id)
        assert updated.name == "Critical Bug"
        assert updated.color == "bg-red-600"

    def test_delete_category(self, fresh_db, sample_category):
        """Test deleting a category"""
        fresh_db.add_category(sample_category)
        fresh_db.delete_category(sample_category.id)

        with pytest.raises(KeyError):
            fresh_db.get_category(sample_category.id)

    def test_delete_category_nullifies_tasks(self, fresh_db, sample_category):
        """Test that deleting a category sets affected tasks to null category"""
        fresh_db.add_category(sample_category)

        # Create task with category
        task = Task(id="task-1", title="Test", category_id=sample_category.id)
        fresh_db.add(task, "test_column")

        # Delete the category
        fresh_db.delete_category(sample_category.id)

        # Verify task's category is now null
        updated_task = fresh_db.get(task.id)
        assert updated_task.category_id is None

    def test_delete_nonexistent_category(self, fresh_db):
        """Test deleting a non-existent category raises KeyError"""
        with pytest.raises(KeyError):
            fresh_db.delete_category("nonexistent-id")


class TestCategoryEndpoints:
    """Test category API endpoints"""

    def test_get_categories_empty(self):
        """Test GET /api/categories returns empty dict initially"""
        response = client.get("/api/categories")
        assert response.status_code == 200
        # May not be empty if other tests added categories, but should be a dict
        assert isinstance(response.json(), dict)

    def test_create_category(self):
        """Test POST /api/categories endpoint"""
        category_data = {"name": "New Category", "color": "bg-blue-500"}
        response = client.post("/api/categories", json=category_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Category"
        assert data["color"] == "bg-blue-500"
        assert "id" in data

    def test_update_category(self):
        """Test PUT /api/categories/{id} endpoint"""
        # First create a category
        create_response = client.post(
            "/api/categories", json={"name": "Original", "color": "bg-gray-500"}
        )
        category_id = create_response.json()["id"]

        # Update the category
        update_response = client.put(
            f"/api/categories/{category_id}",
            json={"name": "Updated", "color": "bg-purple-500"},
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["name"] == "Updated"
        assert data["color"] == "bg-purple-500"

    def test_update_category_not_found(self):
        """Test updating non-existent category"""
        response = client.put(
            "/api/categories/nonexistent-id", json={"name": "Updated"}
        )
        assert response.status_code == 404

    def test_delete_category(self):
        """Test DELETE /api/categories/{id} endpoint"""
        # First create a category
        create_response = client.post(
            "/api/categories", json={"name": "To Delete", "color": "bg-red-500"}
        )
        category_id = create_response.json()["id"]

        # Delete the category
        delete_response = client.delete(f"/api/categories/{category_id}")
        assert delete_response.status_code == 204

    def test_delete_category_not_found(self):
        """Test deleting non-existent category"""
        response = client.delete("/api/categories/nonexistent-id")
        assert response.status_code == 404


class TestTaskWithCategory:
    """Test task operations with category support"""

    def test_create_task_with_category(self):
        """Test creating a task with a category"""
        # First create a category
        cat_response = client.post(
            "/api/categories", json={"name": "Test Cat", "color": "bg-cyan-500"}
        )
        category_id = cat_response.json()["id"]

        # Create task with category
        task_data = {
            "title": "Task with Category",
            "column_id": "test",
            "category_id": category_id,
        }
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 201
        data = response.json()
        assert data["category_id"] == category_id

    def test_create_task_without_category(self):
        """Test creating a task without a category"""
        task_data = {"title": "Task without Category", "column_id": "test"}
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 201
        data = response.json()
        assert data["category_id"] is None

    def test_update_task_category(self):
        """Test updating a task's category"""
        # Create a category
        cat_response = client.post(
            "/api/categories", json={"name": "Update Cat", "color": "bg-pink-500"}
        )
        category_id = cat_response.json()["id"]

        # Create a task without category
        task_response = client.post(
            "/api/tasks", json={"title": "Update Test", "column_id": "test"}
        )
        task_id = task_response.json()["id"]

        # Update the task to add category
        update_response = client.put(
            f"/api/tasks/{task_id}",
            json={"title": "Update Test", "category_id": category_id},
        )
        assert update_response.status_code == 200
        assert update_response.json()["category_id"] == category_id


class TestCategoryBackwardCompatibility:
    """Test backward compatibility for tasks without category_id"""

    def test_import_task_without_category_id(self, fresh_db):
        """Test importing tasks that don't have category_id field"""
        # Simulate old data format without category_id
        old_data = {
            "tasks": {
                "old-task": {"id": "old-task", "title": "Old Task", "description": ""}
            },
            "columns": {"test": ["old-task"]},
        }

        fresh_db.import_from_json(old_data)

        # Task should have null category_id
        task = fresh_db.get("old-task")
        assert task.category_id is None

    def test_import_data_without_categories(self, fresh_db):
        """Test importing data that doesn't have categories key"""
        old_data = {
            "tasks": {
                "task": {
                    "id": "task",
                    "title": "Task",
                    "description": "",
                    "category_id": None,
                }
            },
            "columns": {"test": ["task"]},
            # No categories key
        }

        fresh_db.import_from_json(old_data)

        # Categories should be empty
        categories = fresh_db.get_all_categories()
        assert len(categories) == 0

    def test_export_includes_categories(self, fresh_db, sample_category):
        """Test that export includes categories"""
        fresh_db.add_category(sample_category)

        exported = fresh_db.export_to_json()

        assert "categories" in exported
        assert sample_category.id in exported["categories"]
        assert (
            exported["categories"][sample_category.id]["name"] == sample_category.name
        )
