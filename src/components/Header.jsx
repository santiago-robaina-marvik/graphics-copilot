import React, { useState } from 'react'
import { Presentation, PanelRightClose, PanelRight, Link } from 'lucide-react'
import './Header.css'

function Header({ slidesUrl, onSlidesUrlChange, sidebarOpen, onToggleSidebar }) {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      // Convert edit URL to embed URL
      let embedUrl = inputValue.trim()
      if (embedUrl.includes('/edit')) {
        embedUrl = embedUrl.replace('/edit', '/embed')
      } else if (!embedUrl.includes('/embed')) {
        embedUrl = embedUrl + '/embed'
      }
      // Add parameters for clean embed
      if (!embedUrl.includes('?')) {
        embedUrl += '?start=false&loop=false&delayms=3000'
      }
      onSlidesUrlChange(embedUrl)
    }
  }

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">
            <Presentation size={22} />
          </div>
          <span className="logo-text">Slides AI</span>
        </div>
      </div>

      <form className="url-form" onSubmit={handleSubmit}>
        <div className="url-input-wrapper">
          <Link size={16} className="url-icon" />
          <input
            type="text"
            className="url-input"
            placeholder="Paste Google Slides URL..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="url-submit">
            Load
          </button>
        </div>
      </form>

      <div className="header-right">
        <button 
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelRightClose size={20} /> : <PanelRight size={20} />}
        </button>
      </div>
    </header>
  )
}

export default Header
