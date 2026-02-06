import React, { useState, useRef, useEffect } from "react";
import {
  Grid2X2,
  Square,
  RectangleHorizontal,
  LayoutGrid,
  Save,
  X,
} from "lucide-react";
import "./TemplateSelector.css";

// Display preview dimensions (16:9)
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// Templates with variations (cycling through on repeated clicks)
const TEMPLATES = {
  full: {
    name: "Full",
    slots: 1,
    variations: [{ layout: "full", label: "Full" }],
  },
  half: {
    name: "Half",
    slots: 1,
    variations: [
      { layout: "half-top", label: "Top" },
      { layout: "half-bottom", label: "Bottom" },
      { layout: "half-left", label: "Left" },
      { layout: "half-right", label: "Right" },
    ],
  },
  sideBySide: {
    name: "Split",
    slots: 2,
    variations: [
      { layout: "split-horizontal", label: "Left/Right" },
      { layout: "split-vertical", label: "Top/Bottom" },
    ],
  },
  grid: {
    name: "2×2 Grid",
    slots: 4,
    variations: [{ layout: "grid", label: "Grid" }],
  },
};

function TemplateSelector({ generatedCharts, onSaveTemplate }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variationIndex, setVariationIndex] = useState(0);
  const [slotCharts, setSlotCharts] = useState({});
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  // Calculate scale to fit canvas in overlay
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 24; // padding
        const scaleX = containerWidth / CANVAS_WIDTH;
        // Limit height to roughly 1/3 of viewport
        const maxHeight = window.innerHeight * 0.28;
        const scaleY = maxHeight / CANVAS_HEIGHT;
        const newScale = Math.min(scaleX, scaleY, 0.45);
        setScale(Math.max(newScale, 0.2));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [selectedTemplate]);

  const handleTemplateSelect = (templateKey) => {
    if (selectedTemplate === templateKey) {
      // Cycle to next variation
      const variations = TEMPLATES[templateKey].variations;
      setVariationIndex((prev) => (prev + 1) % variations.length);
    } else {
      // New template selected
      setSelectedTemplate(templateKey);
      setVariationIndex(0);
      setSlotCharts({});
    }
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    setVariationIndex(0);
    setSlotCharts({});
  };

  const handleDrop = (slotIndex, chartId) => {
    setSlotCharts((prev) => ({
      ...prev,
      [slotIndex]: generatedCharts.find((c) => c.id === chartId),
    }));
  };

  const handleSave = async () => {
    if (!currentVariation) return;
    await onSaveTemplate(slotCharts, currentVariation.layout);
    handleClearTemplate();
  };

  const template = selectedTemplate ? TEMPLATES[selectedTemplate] : null;
  const currentVariation = template
    ? template.variations[variationIndex]
    : null;
  const filledSlots = Object.keys(slotCharts).length;
  const canSave = template && filledSlots === template.slots;

  return (
    <div className="template-selector">
      <div className="template-header">
        <span className="template-title">Layout</span>
        <div className="template-buttons">
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              className={`template-btn ${selectedTemplate === key ? "active" : ""}`}
              onClick={() => handleTemplateSelect(key)}
              title={t.name}
            >
              {key === "full" && <Square size={16} />}
              {key === "half" && <RectangleHorizontal size={16} />}
              {key === "sideBySide" && <Grid2X2 size={16} />}
              {key === "grid" && <LayoutGrid size={16} />}
            </button>
          ))}
        </div>
        {selectedTemplate && (
          <div className="template-actions">
            <button
              className="save-template-btn"
              onClick={handleSave}
              disabled={!canSave}
              title={
                canSave
                  ? "Save as chart"
                  : `Fill all ${template.slots} slots first`
              }
            >
              <Save size={14} />
              Save
            </button>
            <button
              className="clear-template-btn"
              onClick={handleClearTemplate}
              title="Clear template"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {selectedTemplate && currentVariation && (
        <div className="template-canvas-overlay" ref={containerRef}>
          <div className="template-overlay-header">
            <span className="variation-label">{currentVariation.label}</span>
            {template.variations.length > 1 && (
              <span className="variation-hint">
                Click button again to cycle ({variationIndex + 1}/
                {template.variations.length})
              </span>
            )}
          </div>
          <div className="template-canvas-container">
            <div
              className={`template-canvas layout-${currentVariation.layout}`}
              style={{
                width: CANVAS_WIDTH * scale,
                height: CANVAS_HEIGHT * scale,
              }}
            >
              {Array.from({ length: template.slots }).map((_, index) => (
                <TemplateSlot
                  key={index}
                  slotIndex={index}
                  chart={slotCharts[index]}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
          <div className="template-overlay-hint">
            Drag charts from the gallery to fill slots
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateSlot({ slotIndex, chart, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const chartId = parseInt(e.dataTransfer.getData("chartId"), 10);
    if (chartId) {
      onDrop(slotIndex, chartId);
    }
  };

  return (
    <div
      className={`template-slot ${isDragOver ? "drag-over" : ""} ${chart ? "filled" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {chart ? (
        <img src={chart.imageUrl} alt="Chart" className="slot-chart-image" />
      ) : (
        <div className="slot-placeholder">
          <span>Drop chart here</span>
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;
