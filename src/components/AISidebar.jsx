import React, { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Download, BarChart3, LineChart, PieChart, TrendingUp, Image, Copy, Check } from 'lucide-react'
import { toPng } from 'html-to-image'
import ChartRenderer from './ChartRenderer'
import DataUpload from './DataUpload'
import './AISidebar.css'

// Generate chart from user data
const generateChartFromData = (data, columns, chartType, xColumn, yColumns) => {
  const colors = ['#3d5afe', '#7c4dff', '#00e5ff', '#00e676', '#ff9100', '#ff4081']
  
  if (chartType === 'pie') {
    // For pie charts, use first column as name and second as value
    const nameCol = xColumn || columns[0]
    const valueCol = yColumns?.[0] || columns[1]
    
    return {
      type: 'pie',
      title: `${valueCol} by ${nameCol}`,
      data: data.slice(0, 10).map((row, i) => ({
        name: row[nameCol]?.toString() || `Item ${i + 1}`,
        value: parseFloat(row[valueCol]) || 0,
        fill: colors[i % colors.length]
      }))
    }
  }

  // For line/bar/area charts
  const nameCol = xColumn || columns[0]
  const valueCols = yColumns || columns.slice(1).filter(col => {
    // Only include numeric columns
    return data.some(row => typeof row[col] === 'number')
  }).slice(0, 2)

  const chartData = data.map(row => {
    const point = { name: row[nameCol]?.toString() || '' }
    valueCols.forEach((col, i) => {
      point[`value${i === 0 ? '' : i + 1}`] = parseFloat(row[col]) || 0
    })
    return point
  })

  return {
    type: chartType,
    title: `${valueCols.join(' vs ')} by ${nameCol}`,
    data: chartData,
    colors: colors.slice(0, valueCols.length)
  }
}

// Mock chart generation - in production this would call an AI API
const generateChartFromPrompt = (prompt, userData = null) => {
  const promptLower = prompt.toLowerCase()
  
  // Detect chart type from prompt
  let chartType = 'bar'
  if (promptLower.includes('line') || promptLower.includes('trend') || promptLower.includes('over time')) {
    chartType = 'line'
  } else if (promptLower.includes('pie') || promptLower.includes('distribution') || promptLower.includes('percentage')) {
    chartType = 'pie'
  } else if (promptLower.includes('area')) {
    chartType = 'area'
  }

  // If user has uploaded data, use it
  if (userData && userData.data && userData.data.length > 0) {
    return generateChartFromData(userData.data, userData.columns, chartType)
  }

  // Otherwise, generate mock data
  const colors = ['#3d5afe', '#7c4dff', '#00e5ff', '#00e676', '#ff9100', '#ff4081']
  
  if (chartType === 'pie') {
    return {
      type: 'pie',
      title: 'Distribution Chart',
      data: [
        { name: 'Category A', value: 35, fill: colors[0] },
        { name: 'Category B', value: 25, fill: colors[1] },
        { name: 'Category C', value: 20, fill: colors[2] },
        { name: 'Category D', value: 12, fill: colors[3] },
        { name: 'Other', value: 8, fill: colors[4] },
      ]
    }
  }

  if (chartType === 'line' || chartType === 'area') {
    return {
      type: chartType,
      title: 'Trend Analysis',
      data: [
        { name: 'Jan', value: 4000, value2: 2400 },
        { name: 'Feb', value: 3000, value2: 1398 },
        { name: 'Mar', value: 5000, value2: 9800 },
        { name: 'Apr', value: 2780, value2: 3908 },
        { name: 'May', value: 1890, value2: 4800 },
        { name: 'Jun', value: 2390, value2: 3800 },
        { name: 'Jul', value: 3490, value2: 4300 },
      ],
      colors: [colors[0], colors[2]]
    }
  }

  // Default bar chart
  return {
    type: 'bar',
    title: 'Comparison Chart',
    data: [
      { name: 'Product A', value: 4000, value2: 2400 },
      { name: 'Product B', value: 3000, value2: 1398 },
      { name: 'Product C', value: 2000, value2: 9800 },
      { name: 'Product D', value: 2780, value2: 3908 },
      { name: 'Product E', value: 1890, value2: 4800 },
    ],
    colors: [colors[0], colors[1]]
  }
}

const suggestedPrompts = [
  { icon: BarChart3, text: "Create a bar chart comparing Q1 sales" },
  { icon: LineChart, text: "Show monthly revenue trend" },
  { icon: PieChart, text: "Make a pie chart of market share" },
  { icon: TrendingUp, text: "Visualize growth over time" },
]

function AISidebar({ isOpen, onChartGenerated, generatedCharts }) {
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      content: "Hi! Upload your data (CSV) or describe what you'd like to visualize and I'll generate a chart you can copy and paste into your slides."
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [copiedCharts, setCopiedCharts] = useState({})
  const [userData, setUserData] = useState(null)
  const messagesEndRef = useRef(null)
  const chartRefs = useRef({})

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (prompt = inputValue) => {
    if (!prompt.trim()) return

    const userMessage = { type: 'user', content: prompt }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsGenerating(true)

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const chartData = generateChartFromPrompt(prompt, userData)
    const chartId = Date.now()
    
    const dataSource = userData ? 'from your data' : 'with sample data'
    const assistantMessage = {
      type: 'assistant',
      content: `I've created a ${chartData.type} chart ${dataSource}. Click "Copy" then paste (Ctrl+V / Cmd+V) directly into Google Slides!`,
      chart: { ...chartData, id: chartId }
    }

    setMessages(prev => [...prev, assistantMessage])
    onChartGenerated({ ...chartData, id: chartId })
    setIsGenerating(false)
  }

  const handleDownloadChart = async (chartId) => {
    try {
      const chartElement = chartRefs.current[chartId]
      if (chartElement) {
        const dataUrl = await toPng(chartElement, { 
          backgroundColor: '#1a1a24',
          pixelRatio: 2 
        })
        const link = document.createElement('a')
        link.download = `chart-${chartId}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error('Failed to download chart:', err)
    }
  }

  const handleCopyChart = async (chartId) => {
    try {
      const chartElement = chartRefs.current[chartId]
      if (!chartElement) return

      const dataUrl = await toPng(chartElement, { 
        backgroundColor: '#1a1a24',
        pixelRatio: 2 
      })
      
      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      
      // Show success state
      setCopiedCharts(prev => ({ ...prev, [chartId]: true }))
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedCharts(prev => ({ ...prev, [chartId]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy chart:', err)
      // Fallback: try to open in new tab for manual copy
      try {
        const chartElement = chartRefs.current[chartId]
        const dataUrl = await toPng(chartElement, { 
          backgroundColor: '#1a1a24',
          pixelRatio: 2 
        })
        window.open(dataUrl, '_blank')
      } catch (e) {
        alert('Could not copy. Try downloading instead.')
      }
    }
  }

  const handleSuggestedPrompt = (text) => {
    handleSend(text)
  }

  if (!isOpen) return null

  return (
    <aside className="ai-sidebar">
      <div className="sidebar-tabs">
        <button 
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <Sparkles size={16} />
          Chat
        </button>
        <button 
          className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          <Image size={16} />
          Charts ({generatedCharts.length})
        </button>
      </div>

      {activeTab === 'chat' ? (
        <>
          <DataUpload onDataLoaded={setUserData} currentData={userData} />
          
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.type === 'assistant' && (
                  <div className="message-avatar">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className="message-content">
                  <p>{msg.content}</p>
                  {msg.chart && (
                    <div className="message-chart">
                      <div 
                        className="chart-preview"
                        ref={el => chartRefs.current[msg.chart.id] = el}
                      >
                        <ChartRenderer chart={msg.chart} />
                      </div>
                      <div className="chart-actions">
                        <button 
                          className={`action-btn copy ${copiedCharts[msg.chart.id] ? 'success' : ''}`}
                          onClick={() => handleCopyChart(msg.chart.id)}
                          title="Copy to clipboard, then paste in Google Slides"
                        >
                          {copiedCharts[msg.chart.id] ? (
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
                          onClick={() => handleDownloadChart(msg.chart.id)}
                          title="Download as PNG"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </div>
                      
                      <div className="copy-hint">
                        <span>After copying, paste directly into Google Slides (Ctrl+V / Cmd+V)</span>
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
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
                    ref={el => chartRefs.current[chart.id] = el}
                  >
                    <ChartRenderer chart={chart} compact />
                  </div>
                  <div className="gallery-actions">
                    <span className="chart-type">{chart.type}</span>
                    <div className="gallery-buttons">
                      <button 
                        className={`gallery-btn copy ${copiedCharts[chart.id] ? 'success' : ''}`}
                        onClick={() => handleCopyChart(chart.id)}
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
                        onClick={() => handleDownloadChart(chart.id)}
                        title="Download"
                      >
                        <Download size={12} />
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
  )
}

export default AISidebar
