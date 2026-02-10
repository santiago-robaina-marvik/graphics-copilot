# Chart Agent Backend

Python backend with Gemini-powered LangGraph agent for data visualization.

## Setup

1. Install dependencies (Poetry creates virtualenv automatically):
```bash
cd backend
poetry install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

3. Run the server:
```bash
poetry run flask run --port 8000 --debug
```

## API Endpoints

### POST /api/chat
Send a message to the agent.

Request:
```json
{
  "message": "Create a bar chart of sales by product",
  "session_id": "unique-session-id",
  "data": [
    {"product": "A", "sales": 100},
    {"product": "B", "sales": 150}
  ]
}
```

Response:
```json
{
  "response": "I've created a bar chart showing sales by product...",
  "chart_url": "/static/charts/chart_20260122_123456.png",
  "session_id": "unique-session-id"
}
```

### GET /health
Health check endpoint.

### GET /api/sessions/{session_id}/history
Get conversation history for a session.
