import React from "react";
import { Palette } from "lucide-react";
import "./ThemeSelector.css";

const themes = [
  {
    id: "meli_dark",
    name: "Meli Dark",
    background: "#0B0C20",
    textColor: "#A5A8AD",
    palette: ["#3483FA", "#FFE600", "#1679ED", "#2860F6", "#00E5FF", "#00A650"],
  },
  {
    id: "meli_light",
    name: "Meli Light",
    background: "#FFFFFF",
    textColor: "#333333",
    palette: ["#3483FA", "#2D3277", "#FFE600", "#1679ED", "#00A650", "#F23D4F"],
  },
  {
    id: "meli_yellow",
    name: "Meli Yellow",
    background: "#FFFFFF",
    textColor: "#2D3277",
    palette: ["#2D3277", "#3483FA", "#0B0C20", "#005CC6", "#06255E", "#333333"],
  },
];

function ThemePreview({ theme, isActive, onClick }) {
  const barHeights = [70, 100, 55, 85, 40];

  return (
    <button
      className={`theme-preview ${isActive ? "active" : ""}`}
      onClick={onClick}
      title={theme.name}
    >
      <div
        className="theme-preview-chart"
        style={{ backgroundColor: theme.background }}
      >
        <div className="mini-bars">
          {barHeights.map((height, i) => (
            <div
              key={i}
              className="mini-bar"
              style={{
                height: `${height}%`,
                backgroundColor: theme.palette[i % theme.palette.length],
              }}
            />
          ))}
        </div>
      </div>
      <span className="theme-name">{theme.name}</span>
    </button>
  );
}

function ThemeSelector({ selectedTheme, onThemeChange }) {
  return (
    <div className="theme-selector">
      <div className="theme-selector-header">
        <Palette size={14} />
        <span>Chart Theme</span>
      </div>
      <div className="theme-options">
        {themes.map((theme) => (
          <ThemePreview
            key={theme.id}
            theme={theme}
            isActive={selectedTheme === theme.id}
            onClick={() => onThemeChange(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default ThemeSelector;
