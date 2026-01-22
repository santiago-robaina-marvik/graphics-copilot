import React from 'react'
import { Presentation, ArrowRight } from 'lucide-react'
import './SlidesViewer.css'

function SlidesViewer({ url, sidebarOpen }) {
  return (
    <div className={`slides-viewer ${sidebarOpen ? '' : 'full-width'}`}>
      {url ? (
        <div className="slides-container">
          <iframe
            src={url}
            frameBorder="0"
            allowFullScreen
            title="Google Slides Presentation"
            className="slides-iframe"
          />
        </div>
      ) : (
        <div className="slides-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon">
              <Presentation size={48} />
            </div>
            <h2>Load a Google Presentation</h2>
            <p>Paste a Google Slides URL in the header to get started</p>
            <div className="placeholder-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Open your presentation in Google Slides</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Copy the URL from your browser</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Paste it above and click "Load"</span>
              </div>
            </div>
            <div className="demo-hint">
              <ArrowRight size={16} />
              <span>Or try the AI assistant to generate charts for your slides</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SlidesViewer
