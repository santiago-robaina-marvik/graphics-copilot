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

/**
 * Extract sheet_id and gid from a Google Sheets URL.
 * @param {string} url - Google Sheets URL
 * @returns {{sheet_id: string, sheet_gid: string} | null}
 */
export function parseSheetUrl(url) {
  if (!url) return null;

  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetMatch) return null;

  const sheet_id = sheetMatch[1];
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
  const sheet_gid = gidMatch ? gidMatch[1] : "0";

  return { sheet_id, sheet_gid };
}

export async function sendChatMessage(
  message,
  sessionId,
  data = null,
  theme = "meli_dark",
  sheetSource = null,
) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      data,
      theme,
      sheet_id: sheetSource?.sheet_id || null,
      sheet_gid: sheetSource?.sheet_gid || null,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
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

export async function regenerateChart(metadata, theme = "meli_dark") {
  const response = await fetch(`${API_URL}/api/regenerate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chart_type: metadata.chart_type,
      x_column: metadata.x_column,
      y_column: metadata.y_column,
      labels_column: metadata.labels_column,
      values_column: metadata.values_column,
      title: metadata.title,
      theme,
      // Include data source for fresh data fetching
      sheet_id: metadata.data_source?.sheet_id || null,
      sheet_gid: metadata.data_source?.sheet_gid || null,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Extract the chart filename from an image URL.
 * @param {string} imageUrl - Full chart URL (e.g., "http://localhost:8000/static/charts/chart_123.png")
 * @returns {string|null} - Filename without extension (e.g., "chart_123") or null if invalid
 */
export function extractChartFilename(imageUrl) {
  if (!imageUrl) return null;
  const match = imageUrl.match(/chart_[^/]+(?=\.png)/);
  return match ? match[0] : null;
}

/**
 * Delete a chart (move to trash).
 * @param {string} filename - Chart filename (with or without .png extension)
 * @returns {Promise<{success: boolean, message: string, filename: string}>}
 */
export async function deleteChart(filename) {
  const response = await fetch(`${API_URL}/api/charts/${filename}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * List charts in trash.
 * @returns {Promise<{items: Array<{filename: string, deleted_at: string, expires_at: string, metadata: object}>, purged_count: number}>}
 */
export async function listTrash() {
  const response = await fetch(`${API_URL}/api/charts/trash`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Restore a chart from trash.
 * @param {string} filename - Chart filename (with or without .png extension)
 * @returns {Promise<{success: boolean, message: string, chart_url: string, chart_metadata: object}>}
 */
export async function restoreChart(filename) {
  const response = await fetch(
    `${API_URL}/api/charts/trash/${filename}/restore`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Compose a layout image from multiple charts on the backend.
 * @param {string[]} chartFilenames - Ordered chart filenames (without .png extension)
 * @param {string} layoutType - Layout type (e.g., "grid", "split-horizontal")
 * @returns {Promise<{success: boolean, chart_url: string, chart_metadata: object}>}
 */
export async function composeLayout(chartFilenames, layoutType) {
  const response = await fetch(`${API_URL}/api/charts/compose-layout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chart_filenames: chartFilenames,
      layout_type: layoutType,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
