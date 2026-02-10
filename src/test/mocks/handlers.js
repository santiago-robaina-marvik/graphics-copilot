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

  // Delete chart (move to trash)
  http.delete(`${API_URL}/api/charts/:filename`, ({ params }) => {
    const filename = params.filename.replace(".png", "");
    if (filename === "chart_nonexistent") {
      return HttpResponse.json(
        { error: "Chart not found: chart_nonexistent" },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      success: true,
      message: "Chart moved to trash",
      filename: `${filename}.png`,
    });
  }),

  // List trash
  http.get(`${API_URL}/api/charts/trash`, () => {
    return HttpResponse.json({
      items: [
        {
          filename: "chart_deleted1.png",
          deleted_at: "2026-01-01T12:00:00",
          expires_at: "2026-01-08T12:00:00",
          metadata: { title: "Deleted Chart 1" },
        },
      ],
      purged_count: 0,
    });
  }),

  // Compose layout
  http.post(`${API_URL}/api/charts/compose-layout`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      chart_url: `/static/charts/chart_layout_${Date.now()}.png`,
      chart_metadata: {
        chart_type: "layout",
        layout_type: body.layout_type,
        source: "template_editor",
        composed_from: body.chart_filenames,
      },
    });
  }),

  // Restore chart from trash
  http.post(`${API_URL}/api/charts/trash/:filename/restore`, ({ params }) => {
    const filename = params.filename.replace(".png", "");
    if (filename === "chart_nonexistent") {
      return HttpResponse.json(
        { error: "Chart not found in trash: chart_nonexistent" },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      success: true,
      message: "Chart restored successfully",
      chart_url: `/static/charts/${filename}.png`,
      chart_metadata: { title: "Restored Chart" },
    });
  }),
];
