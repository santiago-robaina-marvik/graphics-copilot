import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import SlidesViewer from "./components/SlidesViewer";
import AISidebar from "./components/AISidebar";
import DataManager from "./components/DataManager";
import TemplateSelector from "./components/TemplateSelector";
import {
  extractChartFilename,
  composeLayout,
  deleteChart,
  listTrash,
  restoreChart,
  getChartImageUrl,
} from "./services/api";
import "./App.css";

function App() {
  // Load persisted state from localStorage
  const [slidesUrl, setSlidesUrl] = useState(() => {
    const saved = localStorage.getItem("slidesUrl");
    return saved || "";
  });

  const [generatedCharts, setGeneratedCharts] = useState(() => {
    const saved = localStorage.getItem("generatedCharts");
    return saved ? JSON.parse(saved) : [];
  });

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [currentView, setCurrentView] = useState("main");

  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem("activeUserData");
    return saved ? JSON.parse(saved) : null;
  });

  const [chartTheme, setChartTheme] = useState(() => {
    return localStorage.getItem("chartTheme") || "meli_dark";
  });

  const [activeSheetSource, setActiveSheetSource] = useState(() => {
    const saved = localStorage.getItem("activeSheetSource");
    return saved ? JSON.parse(saved) : null;
  });

  const [trashedCharts, setTrashedCharts] = useState([]);

  // Persist slidesUrl to localStorage
  useEffect(() => {
    localStorage.setItem("slidesUrl", slidesUrl);
  }, [slidesUrl]);

  // Persist generatedCharts to localStorage
  useEffect(() => {
    localStorage.setItem("generatedCharts", JSON.stringify(generatedCharts));
  }, [generatedCharts]);

  // Persist sidebarOpen to localStorage
  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Persist userData to localStorage
  useEffect(() => {
    if (userData) {
      localStorage.setItem("activeUserData", JSON.stringify(userData));
    } else {
      localStorage.removeItem("activeUserData");
    }
  }, [userData]);

  // Persist chartTheme to localStorage
  useEffect(() => {
    localStorage.setItem("chartTheme", chartTheme);
  }, [chartTheme]);

  // Persist activeSheetSource
  useEffect(() => {
    if (activeSheetSource) {
      localStorage.setItem(
        "activeSheetSource",
        JSON.stringify(activeSheetSource),
      );
    } else {
      localStorage.removeItem("activeSheetSource");
    }
  }, [activeSheetSource]);

  const handleChartGenerated = (chart) => {
    setGeneratedCharts((prev) => [...prev, chart]);
  };

  const handleChartDeleted = async (chartId) => {
    const chart = generatedCharts.find((c) => c.id === chartId);
    if (!chart) return;

    const filename = extractChartFilename(chart.imageUrl);
    if (!filename) {
      // For template-generated charts (data URLs), just remove locally
      setGeneratedCharts((prev) => prev.filter((c) => c.id !== chartId));
      return;
    }

    try {
      await deleteChart(filename);
      setGeneratedCharts((prev) => prev.filter((c) => c.id !== chartId));
    } catch (error) {
      console.error("Failed to delete chart:", error);
      // If chart not found on backend (already deleted), still remove from UI
      if (error.message.includes("not found")) {
        setGeneratedCharts((prev) => prev.filter((c) => c.id !== chartId));
      } else {
        alert(`Failed to delete chart: ${error.message}`);
      }
    }
  };

  const handleLoadTrash = async () => {
    try {
      const result = await listTrash();
      setTrashedCharts(result.items);
    } catch (error) {
      console.error("Failed to load trash:", error);
    }
  };

  const handleChartRestored = async (filename) => {
    try {
      const result = await restoreChart(filename);
      // Add restored chart to generatedCharts
      const newChart = {
        id: Date.now(),
        imageUrl: getChartImageUrl(result.chart_url),
        metadata: result.chart_metadata,
      };
      setGeneratedCharts((prev) => [...prev, newChart]);
      // Remove from trashedCharts
      setTrashedCharts((prev) =>
        prev.filter((item) => item.filename !== filename),
      );
    } catch (error) {
      console.error("Failed to restore chart:", error);
      alert(`Failed to restore chart: ${error.message}`);
    }
  };

  const handleSaveTemplate = async (slotCharts, layoutType) => {
    try {
      // Extract filenames from chart image URLs
      const chartFilenames = Object.keys(slotCharts)
        .sort((a, b) => Number(a) - Number(b))
        .map((slotIndex) => {
          const chart = slotCharts[slotIndex];
          return extractChartFilename(chart.imageUrl);
        });

      const result = await composeLayout(chartFilenames, layoutType);

      const newChart = {
        id: Date.now(),
        type: `template-${layoutType}`,
        imageUrl: getChartImageUrl(result.chart_url),
        metadata: result.chart_metadata,
      };

      setGeneratedCharts((prev) => [...prev, newChart]);
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  const handleDataUpdate = (data, sheetSource = null) => {
    setUserData(data);
    setActiveSheetSource(sheetSource);
    setCurrentView("main"); // Return to main view after selecting data
  };

  return (
    <div className="app">
      <Header
        slidesUrl={slidesUrl}
        onSlidesUrlChange={setSlidesUrl}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      {currentView === "main" ? (
        <div className="main-content">
          <div className="left-panel">
            <TemplateSelector
              generatedCharts={generatedCharts}
              onSaveTemplate={handleSaveTemplate}
            />
            <SlidesViewer url={slidesUrl} sidebarOpen={sidebarOpen} />
          </div>
          <AISidebar
            isOpen={sidebarOpen}
            onChartGenerated={handleChartGenerated}
            onChartDeleted={handleChartDeleted}
            generatedCharts={generatedCharts}
            userData={userData}
            chartTheme={chartTheme}
            onThemeChange={setChartTheme}
            activeSheetSource={activeSheetSource}
            trashedCharts={trashedCharts}
            onTrashLoad={handleLoadTrash}
            onChartRestored={handleChartRestored}
          />
        </div>
      ) : (
        <DataManager userData={userData} onDataUpdate={handleDataUpdate} />
      )}
    </div>
  );
}

export default App;
