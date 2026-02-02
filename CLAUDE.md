# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Slides AI Assistant - An AI-powered presentation tool that generates charts from user data via natural language. Users upload CSV/Google Sheets data, describe charts in plain language, and copy results to Google Slides.

## Architecture

**Frontend (root directory)**: React 18 + Vite SPA
- Components in `src/components/` with co-located CSS and `__tests__/` directories
- Services in `src/services/` - `api.js` (backend calls), `googleSlides.js` (Google API integration)
- Custom hooks in `src/hooks/` - `useGoogleAuth.js` for OAuth
- All state managed in `App.jsx` via useState hooks, passed down via props (no Context/Redux)
- localStorage persistence pattern: lazy init `useState(() => localStorage.getItem(...))` + `useEffect` to save

**Backend (`backend/` directory)**: Python FastAPI + LangGraph
- Entry: `app/main.py` - FastAPI app with CORS, static file serving, `/api` routes
- Routes: `app/api/routes.py` - `/api/chat` main endpoint, `/api/reset/{session_id}`, `/api/sessions/{session_id}/history`
- Agent: `app/agent/graph.py` - LangGraph ReAct agent with Gemini, singleton pattern via `get_agent()`
- Tools: `app/agent/tools/dataframe.py` (37 data manipulation tools), `app/agent/tools/plotting.py` (4 chart types)
- Data stored in module-level globals (`_current_df`, `_original_df`), charts saved to `static/charts/`

## Commands

### Frontend
```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # Production build to dist/
npm test                 # Run Vitest in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run Cypress E2E tests headless
npm run test:e2e:open    # Open Cypress Test Runner
```

**Run single test:**
```bash
npx vitest src/components/__tests__/App.test.jsx
npx vitest -t "test name"
```

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For testing
cp .env.example .env                 # Add GEMINI_API_KEY

uvicorn app.main:app --reload --port 8000  # Start server
```

**Run tests:**
```bash
pytest                              # All tests
pytest --cov=app --cov-report=term-missing  # With coverage
pytest tests/unit/test_schemas.py   # Single file
pytest -k "test_function_name"      # By name pattern
```

**Linting:**
```bash
ruff check .           # Lint
ruff check --fix .     # Auto-fix
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
- Test setup: `src/test/setup.js` (mocks matchMedia, ResizeObserver, clipboard, Recharts)
- MSW handlers: `src/test/mocks/handlers.js`
- Coverage thresholds: 90% branches, 95% functions/lines/statements

**Backend**: Pytest with asyncio
- Fixtures in `backend/conftest.py` - `client`, `sample_dataframe`, `mock_agent`
- Auto-resets DataFrame state between tests via `reset_dataframe_state` fixture
