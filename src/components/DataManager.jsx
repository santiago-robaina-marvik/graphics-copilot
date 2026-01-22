import React, { useState } from 'react'
import { Upload, Trash2, Eye, EyeOff, Plus, X } from 'lucide-react'
import Papa from 'papaparse'
import './DataManager.css'

function DataManager({ userData, onDataUpdate }) {
  const [datasets, setDatasets] = useState(userData ? [{ id: 1, name: 'Current Dataset', data: userData }] : [])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [showPreview, setShowPreview] = useState(null)
  const [isAddingManual, setIsAddingManual] = useState(false)
  const [manualData, setManualData] = useState({ name: '', csvText: '' })

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newDataset = {
          id: Date.now(),
          name: file.name.replace('.csv', ''),
          data: results.data,
          uploadedAt: new Date().toISOString()
        }
        setDatasets(prev => [...prev, newDataset])
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message)
      }
    })
    e.target.value = ''
  }

  const handleManualAdd = () => {
    if (!manualData.name.trim() || !manualData.csvText.trim()) {
      alert('Please provide both a name and CSV data')
      return
    }

    Papa.parse(manualData.csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newDataset = {
          id: Date.now(),
          name: manualData.name,
          data: results.data,
          uploadedAt: new Date().toISOString()
        }
        setDatasets(prev => [...prev, newDataset])
        setManualData({ name: '', csvText: '' })
        setIsAddingManual(false)
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message)
      }
    })
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this dataset?')) {
      setDatasets(prev => prev.filter(ds => ds.id !== id))
      if (selectedDataset?.id === id) {
        setSelectedDataset(null)
      }
      if (showPreview === id) {
        setShowPreview(null)
      }
    }
  }

  const handleUseDataset = (dataset) => {
    onDataUpdate(dataset.data)
    alert(`"${dataset.name}" is now active for chart generation`)
  }

  const togglePreview = (id) => {
    setShowPreview(showPreview === id ? null : id)
  }

  return (
    <div className="data-manager">
      <div className="data-manager-header">
        <h1>Data Management</h1>
        <p>Upload, view, and manage your datasets for chart generation</p>
      </div>

      <div className="data-manager-actions">
        <label className="upload-button">
          <Upload size={18} />
          Upload CSV File
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
        
        <button 
          className="manual-add-button"
          onClick={() => setIsAddingManual(!isAddingManual)}
        >
          {isAddingManual ? <X size={18} /> : <Plus size={18} />}
          {isAddingManual ? 'Cancel' : 'Add Manual Data'}
        </button>
      </div>

      {isAddingManual && (
        <div className="manual-data-form">
          <input
            type="text"
            placeholder="Dataset name"
            value={manualData.name}
            onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
            className="manual-data-name"
          />
          <textarea
            placeholder="Paste CSV data here (with headers)&#10;Example:&#10;Month,Revenue,Expenses&#10;January,45000,32000&#10;February,52000,35000"
            value={manualData.csvText}
            onChange={(e) => setManualData(prev => ({ ...prev, csvText: e.target.value }))}
            className="manual-data-textarea"
            rows={8}
          />
          <button onClick={handleManualAdd} className="manual-data-submit">
            Add Dataset
          </button>
        </div>
      )}

      {datasets.length === 0 ? (
        <div className="empty-state">
          <Upload size={48} />
          <h3>No datasets yet</h3>
          <p>Upload a CSV file or add data manually to get started</p>
        </div>
      ) : (
        <div className="datasets-list">
          {datasets.map(dataset => (
            <div key={dataset.id} className="dataset-card">
              <div className="dataset-header">
                <div className="dataset-info">
                  <h3>{dataset.name}</h3>
                  <p className="dataset-meta">
                    {dataset.data.length} rows • {Object.keys(dataset.data[0] || {}).length} columns
                    {dataset.uploadedAt && ` • ${new Date(dataset.uploadedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="dataset-actions">
                  <button 
                    className="action-button preview-button"
                    onClick={() => togglePreview(dataset.id)}
                    title={showPreview === dataset.id ? 'Hide preview' : 'Show preview'}
                  >
                    {showPreview === dataset.id ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button 
                    className="action-button use-button"
                    onClick={() => handleUseDataset(dataset)}
                    title="Use this dataset"
                  >
                    Use
                  </button>
                  <button 
                    className="action-button delete-button"
                    onClick={() => handleDelete(dataset.id)}
                    title="Delete dataset"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {showPreview === dataset.id && (
                <div className="dataset-preview">
                  <div className="preview-table-wrapper">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          {Object.keys(dataset.data[0] || {}).map(col => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dataset.data.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).map((val, i) => (
                              <td key={i}>{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {dataset.data.length > 5 && (
                    <p className="preview-note">Showing first 5 of {dataset.data.length} rows</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DataManager
