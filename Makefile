.PHONY: fmt check_fmt test

# Format all code - Python with black and TypeScript with prettier
fmt:
	@echo "🐍 Formatting Python code with black..."
	cd backend && poetry run black .
	@echo "📝 Formatting TypeScript code with prettier..."
	npm run fmt
	@echo "✅ All code formatted successfully"

# Check if code formatting is correct (fails if not properly formatted)
check_fmt:
	@echo "🔍 Checking Python code formatting with black..."
	cd backend && poetry run black --check .
	@echo "🔍 Checking TypeScript code formatting with prettier..."
	npx prettier --check .
	@echo "✅ All code formatting is correct"

# Run all tests - Python with pytest and TypeScript (when available)
test:
	@echo "🧪 Running Python tests with pytest..."
	cd backend && poetry run pytest
	@echo "🧪 Running TypeScript tests..."
	npm run test
	@echo "✅ All tests completed"
