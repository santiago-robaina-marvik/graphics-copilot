import React, { useState } from 'react'
import Header from './components/Header'
import SlidesViewer from './components/SlidesViewer'
import AISidebar from './components/AISidebar'
import DataManager from './components/DataManager'
import './App.css'

function App() {
  const [slidesUrl, setSlidesUrl] = useState('')
  const [generatedCharts, setGeneratedCharts] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState('main') // 'main' or 'data'
  const [userData, setUserData] = useState(null)

  const handleChartGenerated = (chart) => {
    setGeneratedCharts(prev => [...prev, chart])
  }

  const handleDataUpdate = (data) => {
    setUserData(data)
    setCurrentView('main') // Return to main view after selecting data
  }

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
      {currentView === 'main' ? (
        <div className="main-content">
          <SlidesViewer 
            url={slidesUrl} 
            sidebarOpen={sidebarOpen}
          />
          <AISidebar 
            isOpen={sidebarOpen}
            onChartGenerated={handleChartGenerated}
            generatedCharts={generatedCharts}
            userData={userData}
          />
        </div>
      ) : (
        <DataManager 
          userData={userData}
          onDataUpdate={handleDataUpdate}
        />
      )}
    </div>
  )
}

export default App
