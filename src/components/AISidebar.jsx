import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Download,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Image,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { toPng } from "html-to-image";
import ChartRenderer from "./ChartRenderer";
import {
  sendChatMessage,
  getChartImageUrl,
  getOrCreateSessionId,
  resetSession,
} from "../services/api";
import "./AISidebar.css";

const suggestedPrompts = [
  { icon: BarChart3, text: "Create a bar chart comparing Q1 sales" },
  { icon: LineChart, text: "Show monthly revenue trend" },
  { icon: PieChart, text: "Make a pie chart of market share" },
  { icon: TrendingUp, text: "Visualize growth over time" },
];

function AISidebar({
  isOpen,
  onChartGenerated,
  onChartDeleted,
  generatedCharts,
  userData: externalUserData,
}) {
  // Load persisted chat messages
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatMessages");
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      {
        type: "assistant",
        content:
          "Hi! Upload your data (CSV) or describe what you'd like to visualize and I'll generate a chart you can copy and paste into your slides.",
      },
    ];
  });

  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [copiedCharts, setCopiedCharts] = useState({});
  const [userData, setUserData] = useState(null);
  const [sessionId] = useState(() => getOrCreateSessionId());
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const chartRefs = useRef({});

  // Persist chat messages to localStorage
  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  // Update local userData when external data changes
  useEffect(() => {
    if (externalUserData) {
      const columns = Object.keys(externalUserData[0] || {});
      setUserData({ data: externalUserData, columns });
    }
  }, [externalUserData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (prompt = inputValue) => {
    if (!prompt.trim()) return;

    const userMessage = { type: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsGenerating(true);
    setError(null);

    try {
      // Prepare data for API
      const dataToSend = userData?.data || null;

      // Call backend API
      const result = await sendChatMessage(prompt, sessionId, dataToSend);

      const chartId = Date.now();
      const chartUrl = result.chart_url
        ? getChartImageUrl(result.chart_url)
        : null;

      const assistantMessage = {
        type: "assistant",
        content: result.response,
        chartImage: chartUrl,
        chartId: chartUrl ? chartId : null,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Add to generated charts if there's an image
      if (chartUrl) {
        onChartGenerated({
          id: chartId,
          type: "image",
          imageUrl: chartUrl,
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err.message);
      const errorMessage = {
        type: "assistant",
        content: `Sorry, I encountered an error: ${err.message}. Please make sure the backend server is running.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadChart = async (chartId) => {
    try {
      const chartElement = chartRefs.current[chartId];
      if (chartElement) {
        const dataUrl = await toPng(chartElement, {
          backgroundColor: "#1a1a24",
          pixelRatio: 2,
        });
        const link = document.createElement("a");
        link.download = `chart-${chartId}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Failed to download chart:", err);
    }
  };

  const handleCopyChart = async (chartId) => {
    try {
      const chartElement = chartRefs.current[chartId];
      if (!chartElement) return;

      const dataUrl = await toPng(chartElement, {
        backgroundColor: "#1a1a24",
        pixelRatio: 2,
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      // Show success state
      setCopiedCharts((prev) => ({ ...prev, [chartId]: true }));

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedCharts((prev) => ({ ...prev, [chartId]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy chart:", err);
      // Fallback: try to open in new tab for manual copy
      try {
        const chartElement = chartRefs.current[chartId];
        const dataUrl = await toPng(chartElement, {
          backgroundColor: "#1a1a24",
          pixelRatio: 2,
        });
        window.open(dataUrl, "_blank");
      } catch (e) {
        alert("Could not copy. Try downloading instead.");
      }
    }
  };

  const handleSuggestedPrompt = (text) => {
    handleSend(text);
  };

  const handleClearChat = () => {
    if (confirm("Clear all chat messages? This cannot be undone.")) {
      resetSession();
      const initialMessage = {
        type: "assistant",
        content:
          "Hi! Upload your data (CSV) or describe what you'd like to visualize and I'll generate a chart you can copy and paste into your slides.",
      };
      setMessages([initialMessage]);
      localStorage.setItem("chatMessages", JSON.stringify([initialMessage]));
    }
  };

  const handleCopyImageChart = async (imageUrl, chartId) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      setCopiedCharts((prev) => ({ ...prev, [chartId]: true }));
      setTimeout(() => {
        setCopiedCharts((prev) => ({ ...prev, [chartId]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
      // Fallback: open in new tab
      window.open(imageUrl, "_blank");
    }
  };

  const handleDownloadImageChart = async (imageUrl, chartId) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.download = `chart-${chartId}.png`;
      link.href = url;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download:", err);
      // Fallback: open in new tab
      window.open(imageUrl, "_blank");
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="ai-sidebar">
      <div className="sidebar-tabs">
        <button
          className={`tab ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <Sparkles size={16} />
          Chat
        </button>
        <button
          className={`tab ${activeTab === "gallery" ? "active" : ""}`}
          onClick={() => setActiveTab("gallery")}
        >
          <Image size={16} />
          Charts ({generatedCharts.length})
        </button>
      </div>

      {activeTab === "chat" ? (
        <>
          {messages.length > 1 && (
            <div className="chat-actions">
              <button className="clear-chat-button" onClick={handleClearChat}>
                Clear Chat
              </button>
            </div>
          )}

          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.type === "assistant" && (
                  <div className="message-avatar">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className="message-content">
                  <p>{msg.content}</p>
                  {(msg.chart || msg.chartImage) && (
                    <div className="message-chart">
                      <div
                        className="chart-preview"
                        ref={(el) =>
                          (chartRefs.current[msg.chart?.id || msg.chartId] = el)
                        }
                      >
                        {msg.chartImage ? (
                          <img
                            src={msg.chartImage}
                            alt="Generated chart"
                            className="chart-image"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <ChartRenderer chart={msg.chart} />
                        )}
                      </div>
                      <div className="chart-actions">
                        <button
                          className={`action-btn copy ${copiedCharts[msg.chart?.id || msg.chartId] ? "success" : ""}`}
                          onClick={() =>
                            msg.chartImage
                              ? handleCopyImageChart(
                                  msg.chartImage,
                                  msg.chartId,
                                )
                              : handleCopyChart(msg.chart.id)
                          }
                          title="Copy to clipboard, then paste in Google Slides"
                        >
                          {copiedCharts[msg.chart?.id || msg.chartId] ? (
                            <>
                              <Check size={14} />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Copy
                            </>
                          )}
                        </button>

                        <button
                          className="action-btn download"
                          onClick={() =>
                            msg.chartImage
                              ? handleDownloadImageChart(
                                  msg.chartImage,
                                  msg.chartId,
                                )
                              : handleDownloadChart(msg.chart.id)
                          }
                          title="Download as PNG"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </div>

                      <div className="copy-hint">
                        <span>
                          After copying, paste directly into Google Slides
                          (Ctrl+V / Cmd+V)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="message assistant">
                <div className="message-avatar">
                  <Sparkles size={14} />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="suggested-prompts">
              <p className="suggestions-label">Try these:</p>
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  className="suggestion-btn"
                  onClick={() => handleSuggestedPrompt(prompt.text)}
                >
                  <prompt.icon size={14} />
                  {prompt.text}
                </button>
              ))}
            </div>
          )}

          <div className="input-container">
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Describe the chart you want..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isGenerating}
              />
              <button
                className="send-btn"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isGenerating}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="gallery-container">
          {generatedCharts.length === 0 ? (
            <div className="gallery-empty">
              <Image size={32} />
              <p>No charts yet</p>
              <span>Generate charts in the chat to see them here</span>
            </div>
          ) : (
            <div className="gallery-grid">
              {generatedCharts.map((chart) => (
                <div key={chart.id} className="gallery-item">
                  <div
                    className="gallery-chart"
                    ref={(el) => (chartRefs.current[chart.id] = el)}
                  >
                    {chart.imageUrl ? (
                      <img
                        src={chart.imageUrl}
                        alt="Chart"
                        className="chart-image"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <ChartRenderer chart={chart} compact />
                    )}
                  </div>
                  <div className="gallery-actions">
                    <span className="chart-type">{chart.type}</span>
                    <div className="gallery-buttons">
                      <button
                        className={`gallery-btn copy ${copiedCharts[chart.id] ? "success" : ""}`}
                        onClick={() =>
                          chart.imageUrl
                            ? handleCopyImageChart(chart.imageUrl, chart.id)
                            : handleCopyChart(chart.id)
                        }
                        title="Copy to clipboard"
                      >
                        {copiedCharts[chart.id] ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <button
                        className="gallery-btn"
                        onClick={() =>
                          chart.imageUrl
                            ? handleDownloadImageChart(chart.imageUrl, chart.id)
                            : handleDownloadChart(chart.id)
                        }
                        title="Download"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        className="gallery-btn delete"
                        onClick={() => onChartDeleted(chart.id)}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default AISidebar;
