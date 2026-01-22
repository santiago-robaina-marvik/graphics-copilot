import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import SlidesViewer from './components/SlidesViewer'
import AISidebar from './components/AISidebar'
import DataManager from './components/DataManager'
import './App.css'

function App() {
  // Load persisted state from localStorage
  const [slidesUrl, setSlidesUrl] = useState(() => {
    const saved = localStorage.getItem('slidesUrl')
    return saved || ''
  })
  
  const [generatedCharts, setGeneratedCharts] = useState(() => {
    const saved = localStorage.getItem('generatedCharts')
    return saved ? JSON.parse(saved) : []
  })
  
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen')
    return saved !== null ? JSON.parse(saved) : true
  })
  
  const [currentView, setCurrentView] = useState('main')
  
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('activeUserData')
    return saved ? JSON.parse(saved) : null
  })

  // Persist slidesUrl to localStorage
  useEffect(() => {
    localStorage.setItem('slidesUrl', slidesUrl)
  }, [slidesUrl])

  // Persist generatedCharts to localStorage
  useEffect(() => {
    localStorage.setItem('generatedCharts', JSON.stringify(generatedCharts))
  }, [generatedCharts])

  // Persist sidebarOpen to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  // Persist userData to localStorage
  useEffect(() => {
    if (userData) {
      localStorage.setItem('activeUserData', JSON.stringify(userData))
    } else {
      localStorage.removeItem('activeUserData')
    }
  }, [userData])

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
