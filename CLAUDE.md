# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Slides AI Assistant - An AI-powered presentation tool that generates charts from user data via natural language. Users upload CSV/Google Sheets data, describe charts in plain language, and copy results to Google Slides.

## Architecture

**Frontend (root directory)**: React 18 + Vite SPA

- Components in `src/components/` with co-located CSS and `__tests__/` directories
- Services in `src/services/` - `api.js` (backend calls)
- All state managed in `App.jsx` via useState hooks, passed down via props (no Context/Redux)
- localStorage persistence pattern: lazy init `useState(() => localStorage.getItem(...))` + `useEffect` to save

**Backend (`backend/` directory)**: Python Flask + LangGraph

- Entry: `app/main.py` - Flask app with CORS, static file serving, `/api` routes
- Routes: `app/api/routes.py` - `/api/chat` main endpoint, `/api/reset/{session_id}`, `/api/sessions/{session_id}/history`
- Agent: `app/agent/graph.py` - LangGraph ReAct agent with Gemini, singleton pattern via `get_agent()`
- Tools: `app/agent/tools/dataframe.py` (37 data manipulation tools), `app/agent/tools/plotting.py` (4 chart types)
- Data stored in module-level globals (`_current_df`, `_original_df`), charts saved to `static/charts/`

## Commands

**Important: This is a split-directory project.** Frontend commands run from the **repo root** (`/`). Backend commands run from **`backend/`** and require the `poetry run` prefix (the virtualenv is not activated by default).

### Frontend (run from repo root)

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # Production build to dist/
npm test                 # Run Vitest in watch mode
npm run test:coverage    # Run tests with coverage report
```

**Run single test:**

```bash
npx vitest src/components/__tests__/App.test.jsx
npx vitest -t "test name"
```

### Backend (run from `backend/`)

```bash
cd backend
poetry install                                     # Install dependencies
cp .env.example .env                               # Add GEMINI_API_KEY

poetry run flask run --port 8000 --debug                  # Start server
```

**Run tests:**

```bash
poetry run pytest                              # All tests
poetry run pytest --cov=app --cov-report=term-missing  # With coverage
poetry run pytest tests/unit/test_schemas.py   # Single file
poetry run pytest -k "test_function_name"      # By name pattern
```

**Linting & Formatting:**

```bash
poetry run ruff check .           # Lint
poetry run ruff check --fix .     # Auto-fix
poetry run ruff format .          # Format Python code
```

### Formatting (run before committing)

The project uses pre-commit hooks that enforce formatting. **Always run formatters before committing** to avoid commit failures:

```bash
# Frontend (JavaScript/JSX/CSS/JSON)
npx prettier --write "src/**/*.{js,jsx,css,json}"

# Backend (Python)
cd backend && poetry run ruff check --fix . && poetry run ruff format .
```

Or run all formatters at once:
```bash
npx prettier --write "src/**/*.{js,jsx,css,json}" && cd backend && poetry run ruff check --fix . && poetry run ruff format .
```

## Environment Variables

**Frontend** (Vite - prefix with `VITE_`):

- `VITE_API_URL` - Backend URL (default: `http://localhost:8000`)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID for Slides integration

**Backend** (`backend/.env`):

- `GEMINI_API_KEY` - Required. Google Gemini API key
- `GEMINI_MODEL` - Model name (default: `gemini-3-flash-preview`)
- `CHARTS_DIR` - Output directory (default: `static/charts`)

## Key Patterns

**Frontend state persistence:**

```javascript
const [state, setState] = useState(() => {
  const saved = localStorage.getItem("key");
  return saved ? JSON.parse(saved) : defaultValue;
});
useEffect(() => {
  localStorage.setItem("key", JSON.stringify(state));
}, [state]);
```

**Backend tool pattern** (LangGraph tools in `app/agent/tools/`):

```python
@tool
def tool_name(param: str) -> str:
    """Docstring shown to LLM."""
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    # Transform _current_df or generate chart
    return "Success message or error string"
```

**Naming conventions:**

- Component handlers: `handleAction` (e.g., `handleSend`, `handleDelete`)
- Callback props: `onAction` (e.g., `onChartGenerated`, `onDataUpdate`)

## Testing

**Frontend**: Vitest + React Testing Library + MSW for API mocking

- Test setup: `src/test/setup.js` (mocks matchMedia, ResizeObserver, clipboard)
- MSW handlers: `src/test/mocks/handlers.js`
- Coverage thresholds: 90% branches, 95% functions/lines/statements

**Backend**: Pytest

- Fixtures in `backend/conftest.py` - `client`, `sample_dataframe`, `mock_agent`
- Auto-resets DataFrame state between tests via `reset_dataframe_state` fixture

## Way of work

We always test and keep our test impecable. Every single new feature added should come with its corresponding test(s), this allows us to build long lasting, stable code, and lay solid ground for the rest of the code to come.
