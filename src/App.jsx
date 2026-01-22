import React, { useState } from 'react'
import Header from './components/Header'
import SlidesViewer from './components/SlidesViewer'
import AISidebar from './components/AISidebar'
import './App.css'

function App() {
  const [slidesUrl, setSlidesUrl] = useState('')
  const [generatedCharts, setGeneratedCharts] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleChartGenerated = (chart) => {
    setGeneratedCharts(prev => [...prev, chart])
  }

  return (
    <div className="app">
      <Header 
        slidesUrl={slidesUrl} 
        onSlidesUrlChange={setSlidesUrl}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="main-content">
        <SlidesViewer 
          url={slidesUrl} 
          sidebarOpen={sidebarOpen}
        />
        <AISidebar 
          isOpen={sidebarOpen}
          onChartGenerated={handleChartGenerated}
          generatedCharts={generatedCharts}
        />
      </div>
    </div>
  )
}

export default App
