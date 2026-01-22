import React, { useState } from 'react'
import { Upload, Trash2, Eye, EyeOff, Plus, X, Link2, RefreshCw } from 'lucide-react'
import Papa from 'papaparse'
import './DataManager.css'

function DataManager({ userData, onDataUpdate }) {
  const [datasets, setDatasets] = useState(userData ? [{ id: 1, name: 'Current Dataset', data: userData }] : [])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [showPreview, setShowPreview] = useState(null)
  const [isAddingManual, setIsAddingManual] = useState(false)
  const [isAddingSheet, setIsAddingSheet] = useState(false)
  const [manualData, setManualData] = useState({ name: '', csvText: '' })
  const [sheetData, setSheetData] = useState({ name: '', url: '' })
  const [loadingSheet, setLoadingSheet] = useState(false)

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

  // Convert Google Sheets URL to CSV export URL
  const convertToCSVUrl = (url) => {
    // Handle different Google Sheets URL formats
    let sheetId = null
    let gid = null

    // Format: https://docs.google.com/spreadsheets/d/{id}/edit...
    const match1 = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match1) {
      sheetId = match1[1]
    }

    // Extract gid (sheet tab) if present
    const gidMatch = url.match(/[#&]gid=([0-9]+)/)
    if (gidMatch) {
      gid = gidMatch[1]
    }

    if (!sheetId) {
      throw new Error('Invalid Google Sheets URL')
    }

    // Build CSV export URL
    let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
    if (gid) {
      csvUrl += `&gid=${gid}`
    }

    return csvUrl
  }

  const handleSheetConnect = async () => {
    if (!sheetData.url.trim()) {
      alert('Please provide a Google Sheets URL')
      return
    }

    setLoadingSheet(true)

    try {
      // Convert to CSV export URL
      const csvUrl = convertToCSVUrl(sheetData.url)

      // Fetch the CSV data
      const response = await fetch(csvUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sheet. Make sure the sheet is shared publicly (Anyone with the link can view).')
      }

      const csvText = await response.text()

      // Parse the CSV
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const newDataset = {
            id: Date.now(),
            name: sheetData.name.trim() || 'Google Sheet',
            data: results.data,
            uploadedAt: new Date().toISOString(),
            source: 'google-sheets',
            sourceUrl: sheetData.url
          }
          setDatasets(prev => [...prev, newDataset])
          setSheetData({ name: '', url: '' })
          setIsAddingSheet(false)
          setLoadingSheet(false)
        },
        error: (error) => {
          setLoadingSheet(false)
          alert('Error parsing sheet data: ' + error.message)
        }
      })
    } catch (error) {
      setLoadingSheet(false)
      alert(error.message)
    }
  }

  const handleRefreshSheet = async (dataset) => {
    if (!dataset.sourceUrl) return

    setLoadingSheet(true)

    try {
      const csvUrl = convertToCSVUrl(dataset.sourceUrl)
      const response = await fetch(csvUrl)
      
      if (!response.ok) {
        throw new Error('Failed to refresh sheet data')
      }

      const csvText = await response.text()

      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          setDatasets(prev => prev.map(ds => 
            ds.id === dataset.id 
              ? { ...ds, data: results.data, uploadedAt: new Date().toISOString() }
              : ds
          ))
          setLoadingSheet(false)
          alert('Sheet data refreshed successfully')
        },
        error: (error) => {
          setLoadingSheet(false)
          alert('Error parsing sheet data: ' + error.message)
        }
      })
    } catch (error) {
      setLoadingSheet(false)
      alert(error.message)
    }
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
          onClick={() => {
            setIsAddingManual(!isAddingManual)
            if (!isAddingManual) setIsAddingSheet(false)
          }}
        >
          {isAddingManual ? <X size={18} /> : <Plus size={18} />}
          {isAddingManual ? 'Cancel' : 'Add Manual Data'}
        </button>

        <button 
          className="sheet-connect-button"
          onClick={() => {
            setIsAddingSheet(!isAddingSheet)
            if (!isAddingSheet) setIsAddingManual(false)
          }}
        >
          {isAddingSheet ? <X size={18} /> : <Link2 size={18} />}
          {isAddingSheet ? 'Cancel' : 'Connect Google Sheet'}
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

      {isAddingSheet && (
        <div className="manual-data-form sheet-connect-form">
          <div className="sheet-instructions">
            <p><strong>How to connect:</strong></p>
            <ol>
              <li>Open your Google Sheet</li>
              <li>Click "Share" and set to "Anyone with the link can view"</li>
              <li>Copy the URL from your browser</li>
              <li>Paste it below</li>
            </ol>
          </div>
          <input
            type="text"
            placeholder="Dataset name (optional)"
            value={sheetData.name}
            onChange={(e) => setSheetData(prev => ({ ...prev, name: e.target.value }))}
            className="manual-data-name"
          />
          <input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetData.url}
            onChange={(e) => setSheetData(prev => ({ ...prev, url: e.target.value }))}
            className="manual-data-name"
          />
          <button 
            onClick={handleSheetConnect} 
            className="manual-data-submit"
            disabled={loadingSheet}
          >
            {loadingSheet ? 'Connecting...' : 'Connect Sheet'}
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
                  <h3>
                    {dataset.name}
                    {dataset.source === 'google-sheets' && (
                      <span className="dataset-badge">Google Sheets</span>
                    )}
                  </h3>
                  <p className="dataset-meta">
                    {dataset.data.length} rows • {Object.keys(dataset.data[0] || {}).length} columns
                    {dataset.uploadedAt && ` • ${new Date(dataset.uploadedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="dataset-actions">
                  {dataset.source === 'google-sheets' && (
                    <button 
                      className="action-button refresh-button"
                      onClick={() => handleRefreshSheet(dataset)}
                      title="Refresh data from Google Sheets"
                      disabled={loadingSheet}
                    >
                      <RefreshCw size={18} className={loadingSheet ? 'spinning' : ''} />
                    </button>
                  )}
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
