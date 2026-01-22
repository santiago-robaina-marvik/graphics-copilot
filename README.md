# Slides AI Assistant

An AI-powered presentation assistant that helps you create charts and visualizations for Google Slides using your own data.

## Features

- **📊 Data Upload**: Upload CSV files to create charts from your real data
- **🎨 AI Chart Generator**: Describe charts in natural language
- **📋 Copy to Clipboard**: One-click copy, paste directly into Google Slides
- **💾 Download Charts**: Export as PNG images
- **📁 Chart Gallery**: Track all generated charts

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173

## Usage

### 1. Upload Your Data (Optional)
- Click the upload area or drag & drop a CSV file
- Preview shows columns and sample rows
- Charts will automatically use your data

### 2. Generate Charts
Describe what you want:
- "Create a bar chart comparing sales by product"
- "Show revenue trend over time as a line chart"
- "Make a pie chart of market distribution"

### 3. Copy & Paste
- Click **Copy** button
- Go to Google Slides
- Press **Ctrl+V** (Windows) or **Cmd+V** (Mac)
- Resize and position as needed

## CSV Format

Your CSV should have:
- **Header row** with column names
- **Numeric columns** for values to plot
- **Text column** for labels (product names, dates, etc.)

Example:
```csv
Month,Revenue,Expenses
January,45000,32000
February,52000,35000
March,48000,33000
```

## Chart Types

The AI detects chart type from your prompt:
- **Bar Chart**: "compare", "bar chart"
- **Line Chart**: "trend", "over time", "line chart"
- **Pie Chart**: "distribution", "percentage", "pie chart"
- **Area Chart**: "area chart"

## Tech Stack

- React + Vite
- Recharts for data visualization
- PapaParse for CSV parsing
- html-to-image for chart export
- Lucide React for icons

## Sample Data

A sample CSV is included at `public/sample-data.csv` with monthly revenue data.

## Future Enhancements

- [ ] Connect to real AI API (OpenAI, Claude) for smarter chart generation
- [ ] Support Excel files (.xlsx)
- [ ] Column selection for custom chart mapping
- [ ] More chart types (scatter, heatmap, etc.)
- [ ] Chart customization (colors, labels, titles)
- [ ] Save/load chart configurations
- [ ] Google Sheets integration
