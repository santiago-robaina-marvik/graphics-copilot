const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getOrCreateSessionId() {
  let sessionId = localStorage.getItem("chatSessionId");
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem("chatSessionId", sessionId);
  }
  return sessionId;
}

export function resetSession() {
  const newSessionId = generateSessionId();
  localStorage.setItem("chatSessionId", newSessionId);
  return newSessionId;
}

export async function sendChatMessage(message, sessionId, data = null) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      data,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export function getChartImageUrl(chartPath) {
  if (!chartPath) return null;
  // chartPath is like "/static/charts/chart_xxx.png"
  return `${API_URL}${chartPath}`;
}

export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
