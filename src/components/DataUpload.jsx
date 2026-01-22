import React, { useState, useRef } from "react";
import { Upload, X, FileSpreadsheet, AlertCircle, Check } from "lucide-react";
import Papa from "papaparse";
import "./DataUpload.css";

function DataUpload({ onDataLoaded, currentData }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    setError(null);

    if (
      !file.name.endsWith(".csv") &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      setError("Please upload a CSV file");
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV: " + results.errors[0].message);
          return;
        }

        if (results.data.length === 0) {
          setError("CSV file is empty");
          return;
        }

        // Create preview
        const columns = Object.keys(results.data[0]);
        const previewData = {
          filename: file.name,
          rows: results.data.length,
          columns: columns,
          sample: results.data.slice(0, 5),
        };

        setPreview(previewData);
        onDataLoaded({
          data: results.data,
          columns: columns,
          filename: file.name,
        });
      },
      error: (error) => {
        setError("Failed to parse file: " + error.message);
      },
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    onDataLoaded(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="data-upload">
      {!preview ? (
        <div
          className={`upload-zone ${isDragging ? "dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} />
          <h3>Upload Your Data</h3>
          <p>Drag and drop a CSV file or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div className="data-preview">
          <div className="preview-header">
            <div className="preview-title">
              <FileSpreadsheet size={18} />
              <span>{preview.filename}</span>
              <span className="preview-meta">
                {preview.rows} rows × {preview.columns.length} columns
              </span>
            </div>
            <button
              className="clear-btn"
              onClick={handleClear}
              title="Remove data"
            >
              <X size={16} />
            </button>
          </div>

          <div className="preview-content">
            <div className="preview-columns">
              <strong>Columns:</strong>
              <div className="column-tags">
                {preview.columns.map((col, i) => (
                  <span key={i} className="column-tag">
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {preview.columns.map((col, i) => (
                      <th key={i}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((row, i) => (
                    <tr key={i}>
                      {preview.columns.map((col, j) => (
                        <td key={j}>{row[col]?.toString() || "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="preview-footer">
              <Check size={14} />
              <span>Data loaded successfully. Charts will use this data.</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default DataUpload;
