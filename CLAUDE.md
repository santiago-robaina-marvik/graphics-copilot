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
- Test setup: `src/test/setup.js` (mocks matchMedia, ResizeObserver, clipboard)
- MSW handlers: `src/test/mocks/handlers.js`
- Coverage thresholds: 90% branches, 95% functions/lines/statements

**Backend**: Pytest with asyncio
- Fixtures in `backend/conftest.py` - `client`, `sample_dataframe`, `mock_agent`
- Auto-resets DataFrame state between tests via `reset_dataframe_state` fixture

---

# MercadoLibre MCP Authority-First Development Rule

This rule enforces mandatory consultation of three configured MCP servers before providing any implementation guidance. These MCPs serve as single sources of truth for Fury platform services, API specifications, and code quality.

**Pre-configured MCPs (from default-mcps.json):**
- `backend` — MCP namespace grouping Fury platform services (fury_for_development, kvs, os, secrets, bigqueue)
- `genai_code_review` — Automated code review and analysis
- `meli_appsec_codeguard` — Application security and code quality scanning

---

## CRITICAL: MANDATORY MCP CONSULTATION

### NEVER provide guidance without MCP consultation for:
1. **Fury Services** → Must use `mcp__fury__search_sdk_docs`
2. **API Documentation** → Must use `mcp__fury__search_api_docs`
3. **MCP Discovery** → Must use `mcp__fury__find_mcp_server`
4. **Code Reviews** → Must use `mcp__genai_code_review__code_review_instructions` or `pr_review_search`
5. **Security Scanning** → Must use `mcp__meli_appsec_codeguard__*` tools

---

## BACKEND NAMESPACE (MCP Gateway)

The `backend` namespace is a **proxy grouper** that provides unified access to multiple Fury-related MCPs:
- **fury_for_development** — Fury platform documentation and MCP discovery
- **kvs** — Key-Value Store service
- **os** — Object Storage service
- **bigqueue** — Big queue service
- **secrets** — Secrets service


### Tool 1: `search_sdk_docs` - SDK Documentation (from fury_for_development)
**MANDATORY for any Fury service implementation:**

**Trigger Keywords:**
- kvs, key-value store, bigqueue, message queue, mq
- object storage, os, document search, ds
- streaming, stream, workqueue, locks, sequence
- core library, fury sdk, client setup, batch operations

**Required Parameters:**
- `service`: kvs | bigqueue | os | ds | stream | workqueue | locks | sequence | core
- `language`: java | go | python | typescript
- `query`: specific implementation question

**Usage Pattern:**
```
User asks about KVS →
MUST call mcp__fury__search_sdk_docs(service="kvs", language="java", query="client setup") →
Base ALL responses on returned documentation
```

### Tool 2: `search_api_docs` - API Documentation (from fury_for_development)
**MANDATORY for any Fury application API:**

**Trigger Keywords:**
- api documentation, current api, existing api, this api
- fury application, api architecture, endpoints
- authentication, api configuration

**Required Parameters:**
- `api_name_to_search`: exact application name
- `query`: optional specific question

**Usage Pattern:**
```
User asks about Items API →
MUST call mcp__fury__search_api_docs(api_name_to_search="items", query="endpoints") →
Provide documentation exactly as returned
```

### Tool 3: `find_mcp_server` - MCP Discovery (from fury_for_development)
**Use ONLY when user explicitly asks for new MCP servers:**

**Trigger Keywords:**
- "is there an MCP for", "recommend an MCP"
- "I need an MCP to", "MCP server for"
- frontend development, database management, testing tools

**Required Parameters:**
- `query`: description of desired functionality

**Usage Pattern:**
```
User: "Is there an MCP for frontend development?" →
Call mcp__fury__find_mcp_server(query="frontend development Nordic Andes") →
Present server info and setup instructions
```

### Tool 4: `search_api_specs` - API Specifications (from fury_for_development):

Centralizes OpenAPI/AsyncAPI specifications for Fury applications. Treat it as the canonical source for endpoint definitions, schemas, and contract changes.

**Trigger Keywords:**
- openapi, asyncapi, api spec, schema definition
- request payload, response payload, contract change
- versioned api, endpoint contract, http client

**Required Parameters:**
- `app_name`: exact Fury application name as registered in Specs Hub
- `query`: optional focus area (endpoint path, component name, version tag)

**Usage Pattern:**
```
User: "For the Payments application, what is the POST /payments request schema?" →
MUST call mcp__fury__search_api_specs(app_name="payments", query="POST /payments request payload") →
Honor the returned spec as the integration contract
```

**Use this tool whenever:**
- Answering questions about API contracts, request/response payloads, or versioned changes
- Implementing, updating, or reviewing integration code against a Fury API

---

## GENAI_CODE_REVIEW MCP

### Tool 1: `code_review_instructions`
**Generates comprehensive, executable instructions for conducting code reviews based on application-specific rules.**

**Trigger Keywords:**
- review changes, code review, review instructions
- code quality, before commit, diff analysis
- application rules, review workflow

**Required Parameters:**
- `application_name`: Name of the application being reviewed (usually found in `.fury` file in repository root)

**Usage Pattern:**
```
User: "Review my changes" →
MUST call code_review_instructions(application_name="app-name") →
Execute returned analysis workflow →
Present findings prioritized by severity
```

### Tool 2: `pr_review_search`
**Retrieves code review execution history for a specific application and pull request number.**

**Trigger Keywords:**
- PR review history, past reviews, review results
- pull request analysis, PR number review
- review execution status

**Required Parameters:**
- `application_name`: Name of the application being reviewed (usually found in `.fury` file in repository root)
- `pr_number`: Pull request number to retrieve reviews for

**Usage Pattern:**
```
User: "Show me the reviews for PR #123" →
MUST call pr_review_search(application_name="app-name", pr_number=123) →
Present review history including execution status, costs, and outputs
```

---

## EXECUTION RULES

### 1. Detection & Blocking
```python
if user_query contains fury_keywords:
    BLOCK all responses
    CALL mcp__fury__ tools FIRST (search_sdk_docs, search_api_docs, search_api_specs, or find_mcp_server)
    WAIT for documentation
    RESPOND based only on MCP output

elif user_query contains review_keywords:
    BLOCK all responses
    CALL mcp__genai_code_review__ tools FIRST
    WAIT for analysis
    RESPOND based only on MCP output

elif user_query contains security_keywords:
    BLOCK all responses
    CALL mcp__meli_appsec_codeguard__ tools FIRST
    WAIT for analysis
    RESPOND based only on MCP output

elif user_query explicitly_asks_for_mcp:
    CALL mcp__fury__find_mcp_server
    Present recommendations with setup

else:
    Proceed normally
```

### 2. Parallel Execution Guidelines
**ALLOWED in parallel:**
- Multiple `mcp__fury__search_sdk_docs` calls for different services
- `mcp__fury__search_api_docs` + `mcp__genai_code_review__*` (different contexts)

**MUST be sequential:**
- Any code review followed by fixes
- MCP discovery followed by setup
- Documentation fetch before implementation

### 3. Response Attribution Pattern
```
ALWAYS start with: "Based on [MCP_NAME] documentation..."
NEVER say: "I'll help you with..." before calling MCP
ALWAYS end with: MCP source attribution
```

---

## ERROR HANDLING PROTOCOL

### MCP Failure Response Template:
```
"The [MCP_NAME] returned an error: [exact_error_message]
Cannot provide [implementation/API/review] guidance without official documentation.
Please contact fury@mercadolibre.com if this persists."
```

### Missing Information Protocol:
```
if service/language/app_name unclear:
    1. Ask: "Which [service/language/application] specifically?"
    2. Wait for clarification
    3. Call appropriate MCP with specific params
    4. Never guess or use defaults
```

---

## GOLDEN RULES

1. **MCP calls are GATES, not supplements** - Call BEFORE any guidance
2. **Documentation is LAW** - Never override with general knowledge
3. **Errors are FINAL** - Never work around MCP failures
4. **Discovery is ON-DEMAND** - Only suggest MCPs when explicitly asked
5. **Attribution is MANDATORY** - Always cite MCP sources
