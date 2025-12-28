# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# KanFlow - Codebase Analysis

## Project Overview

KanFlow is a single-user Kanban board application built with React frontend and FastAPI backend. The application supports drag-and-drop task management across five columns: Ideas, Selected, In Progress, Parked, and Done. This project was developed using "vibe coding" techniques with Claude Code CLI.

You should always call `make precommit` before making a commit. NEVER commit code that doesn't pass the precommit.

## Commands & Development Workflow

### Frontend Commands (npm)

```bash
# Code Quality
npm run fmt             # Format code with Prettier
npm run lint            # Lint with ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run test            # Run tests once
npm run test:watch      # Run tests in watch mode
```

### Backend Commands (uv)

```bash
cd backend
uv sync                                        # Install dependencies
DEV_NO_CORS=1 uv run uvicorn app:app --reload  # Start backend with CORS disabled
uv run pytest                                  # Run backend tests
uv run black .                                 # Format Python code
```

### Unified Commands (Makefile)

```bash
make precommit        # Format and Run all tests (frontend + backend)
```

## Architecture & Structure

### Frontend Architecture

#### Component Hierarchy

```
App (Root Component)
├── ColumnComponent (x5 - one per column)
│   └── TaskCard (multiple per column)
└── TaskModal (conditional rendering)
```

#### Custom Hooks Pattern

The application uses custom hooks for separation of concerns:

- **`useTasks`** - Data management and API interactions
- **`useDragAndDrop`** - Drag & drop state and event handling

#### State Management

- **Local State**: React useState for UI state (modals, form inputs)
- **Server State**: Custom hooks manage server synchronization

#### Data Flow

1. `useTasks` fetches initial data and provides CRUD operations
2. `useDragAndDrop` handles drag/drop interactions
3. Components receive data and actions via props drilling

### Backend Architecture

#### FastAPI Structure

- **RESTful API** with Pydantic models for validation
- **JSON file storage** with automatic periodic backups
- **CORS middleware** conditionally enabled for development
- **Static file serving** for production deployment

#### API Endpoints

```
GET    /api/tasks           # Fetch all tasks by column
POST   /api/tasks           # Create new task
PUT    /api/tasks/{id}      # Update task
DELETE /api/tasks/{id}      # Delete task
POST   /api/tasks/{id}/move # Move task between columns
DELETE /api/columns/{id}/empty # Empty column
```

## Key Patterns & Conventions

### Component Patterns

#### 1. Props Interface Pattern

```typescript
interface ComponentProps {
  // Required props first
  data: DataType;
  onAction: (param: Type) => void;

  // Optional props with defaults
  variant?: "primary" | "secondary";
  className?: string;
}
```

#### 2. Event Handler Pattern

- Prefix with `handle` (e.g., `handleSaveTask`)
- Use `useCallback` for performance optimization
- Consistent parameter ordering (event, then custom params)

#### 3. Conditional Rendering

```typescript
// Early returns for loading/error states
if (isLoading) return <LoadingComponent />;
if (error) return <ErrorComponent />;

// JSX conditional rendering
{isOpen && <Modal />}
{items.length === 0 && <EmptyState />}
```

### State Management Patterns

#### 1. Derived State

- Compute values from props/state rather than storing separately
- Use useMemo for expensive calculations
- Filter/transform data in render methods

#### 2. Error Handling

- Centralized error state in data hooks
- Automatic retry mechanisms
- User-friendly error messages
- Graceful degradation

### Drag & Drop Implementation

#### State Structure

```typescript
interface DragState {
  isDragging: boolean;
  draggedTaskId: string | null;
  dragOverColumn: ColumnId | null;
  dragOverIndex: number | null; // Insertion point
}
```

#### Visual Feedback

- Drop indicators show insertion points
- Dragged items become semi-transparent
- Real-time drop zone highlighting

#### Position Calculation

- Uses `getBoundingClientRect()` for precise positioning
- Calculates insertion index based on mouse Y coordinate
- Handles multi-line task cards correctly

### Testing Strategies

#### Frontend Testing (Vitest + Testing Library)

- **Integration tests** for full user workflows
- **Component tests** for individual components
- **Hook tests** for custom hook logic
- **Mocked API** responses for predictable testing

#### Test Structure

```typescript
describe("Component/Feature", () => {
  beforeEach(() => {
    // Setup mocks and cleanup
  });

  it("describes specific behavior", async () => {
    // Arrange, Act, Assert pattern
  });
});
```

#### Testing Patterns

- Use `screen` queries for accessibility-first element selection
- `userEvent` for realistic user interactions
- `waitFor` for async operations
- Mock external dependencies (fetch, window methods)

### CSS & Styling

#### Tailwind CSS Approach

- **Utility-first** styling approach
- **Responsive design** with breakpoint prefixes
- **Dark theme** as primary design choice
- **Consistent spacing** using Tailwind's spacing scale

#### Color Scheme

- **Background**: Gray-900 (dark theme)
- **Cards**: Gray-700/800
- **Accent**: Sky-400/500 (blue)
- **Interactive**: Hover states with opacity/color changes

#### Responsive Patterns

```css
/* Mobile-first responsive grid */
grid-cols-1 md:grid-cols-3 lg:grid-cols-5

/* Responsive flex layouts */
flex-col sm:flex-row
```

## File Organization

### Frontend Structure

```
/
├── components/           # Reusable UI components
│   ├── Column.tsx       # Kanban column with tasks
│   ├── TaskCard.tsx     # Individual task representation
│   ├── TaskModal.tsx    # Task editing modal
│   └── *.test.tsx       # Component tests
├── hooks/               # Custom React hooks
│   ├── useTasks.ts      # Data fetching and CRUD operations
│   ├── useDragAndDrop.ts # Drag & drop logic
│   └── *.test.ts        # Hook tests
├── test/                # Test utilities and setup
├── types.ts             # TypeScript type definitions
├── constants.ts         # Application constants
├── App.tsx              # Root component
└── index.tsx            # Application entry point
```

### Backend Structure

```
backend/
├── app.py              # FastAPI application
├── test_app.py         # API endpoint tests
├── pyproject.toml      # Python dependencies
├── database.json       # Data persistence (generated)
└── uv.lock             # Dependency lock file
```

## Dependencies & Technology Choices

### Frontend Dependencies

#### Core Framework

- **React 19** - Latest React with concurrent features
- **TypeScript** - Type safety and developer experience
- **Vite** - Fast build tool and dev server

#### UI & Styling

- **Tailwind CSS** - Utility-first CSS framework (implied from classes)
- **@uiw/react-md-editor** - Markdown editing for task descriptions

#### Testing

- **Vitest** - Fast unit test runner (Vite-native)
- **@testing-library/react** - Component testing utilities
- **@testing-library/user-event** - Realistic user interactions
- **jsdom** - DOM environment for tests

#### Development Tools

- **ESLint** - Code linting with React-specific rules
- **Prettier** - Code formatting
- **TypeScript ESLint** - TypeScript-aware linting

### Backend Dependencies

#### Core Framework

- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server for FastAPI
- **Pydantic** - Data validation and serialization

#### Development Tools

- **pytest** - Python testing framework
- **black** - Python code formatter
- **pyright** - Static type checker for Python

## Configuration Files

### TypeScript Configuration

- **Target**: ES2020 for modern browser support
- **Module**: ESNext with bundler resolution
- **Strict mode** enabled for type safety
- **Path mapping**: `@/*` for clean imports

### Build Configuration

- **Vite**: Minimal configuration with test setup
- **ESLint**: React + TypeScript rules with hooks linting
- **No minification** in production builds (explicitly disabled)

### Test Configuration

- **Global test environment**: jsdom for DOM testing
- **Setup files**: Global mocks and utilities
- **CSS support**: Enabled for component testing

## Security Considerations

**Note**: The README explicitly warns that this application has security vulnerabilities and should not be exposed to the internet:

- CORS is completely disabled in development
- Path traversal vulnerabilities were mentioned
- Designed for isolated/trusted environments only
- No authentication built-in (relies on external auth proxy)

## Notable Implementation Details

### Drag & Drop Precision

The drag & drop implementation features:

- Pixel-perfect drop position calculation
- Visual insertion indicators
- Support for multi-line task cards
- Smooth animations and transitions

### Error Handling

Comprehensive error handling includes:

- Network failure recovery
- Authentication redirection
- User-friendly error messages
- Graceful degradation patterns

### Performance Optimizations

- `useCallback` for event handlers to prevent unnecessary re-renders
- Efficient re-rendering with proper dependency arrays
- Minimal bundle size with selective imports

This architecture demonstrates modern React patterns with emphasis on user experience, type safety, and maintainable code organization.
