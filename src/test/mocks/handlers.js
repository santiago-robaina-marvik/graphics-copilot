import { http, HttpResponse } from "msw";

const API_URL = "http://localhost:8000";

export const handlers = [
  // Health check
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Chat endpoint
  http.post(`${API_URL}/api/chat`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      response: `AI response to: ${body.message}`,
      chart_url: body.message.includes("chart")
        ? "/static/charts/test_chart.png"
        : null,
      session_id: body.session_id,
    });
  }),

  // Session reset
  http.post(`${API_URL}/api/reset/:sessionId`, ({ params }) => {
    return HttpResponse.json({
      status: "ok",
      message: `Session ${params.sessionId} will be reset on next message`,
    });
  }),

  // Session history
  http.get(`${API_URL}/api/sessions/:sessionId/history`, () => {
    return HttpResponse.json([
      { role: "human", content: "Hello" },
      { role: "ai", content: "Hi there! How can I help?" },
    ]);
  }),
];
