import React, { useState, useEffect } from "react";
import { toPng } from "html-to-image";
import Header from "./components/Header";
import SlidesViewer from "./components/SlidesViewer";
import AISidebar from "./components/AISidebar";
import DataManager from "./components/DataManager";
import TemplateSelector from "./components/TemplateSelector";
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

  const handleChartGenerated = (chart) => {
    setGeneratedCharts((prev) => [...prev, chart]);
  };

  const handleChartDeleted = (chartId) => {
    setGeneratedCharts((prev) => prev.filter((chart) => chart.id !== chartId));
  };

  const handleSaveTemplate = async (templateElement, templateType) => {
    try {
      // Store original transform and temporarily reset for full-size capture
      const originalTransform = templateElement.style.transform;
      templateElement.style.transform = "none";

      const dataUrl = await toPng(templateElement, {
        backgroundColor: "transparent",
        pixelRatio: 2, // 2x for retina quality (outputs 1920x1080)
        width: 960,
        height: 540,
        style: {
          transform: "none",
          background: "transparent",
        },
      });

      // Restore original transform
      templateElement.style.transform = originalTransform;

      const newChart = {
        id: Date.now(),
        type: `template-${templateType}`,
        imageUrl: dataUrl,
      };

      setGeneratedCharts((prev) => [...prev, newChart]);
    } catch (err) {
      console.error("Failed to save template:", err);
      // Restore transform on error
      if (templateElement) {
        templateElement.style.transform = "";
      }
    }
  };

  const handleDataUpdate = (data) => {
    setUserData(data);
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
          />
        </div>
      ) : (
        <DataManager userData={userData} onDataUpdate={handleDataUpdate} />
      )}
    </div>
  );
}

export default App;
