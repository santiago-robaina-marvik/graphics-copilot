# Slides AI Assistant

An AI-powered presentation assistant that helps you create charts and visualizations for Google Slides using your own data.

## Features

- **📊 Data Upload**: Upload CSV files to create charts from your real data
- **🔗 Google Sheets Integration**: Connect to public Google Sheets via URL
- **🎨 AI Chart Generator**: Describe charts in natural language
- **📋 Copy to Clipboard**: One-click copy, paste directly into Google Slides
- **💾 Download Charts**: Export as PNG images
- **📁 Chart Gallery**: Track all generated charts
- **🔄 Data Refresh**: Sync latest data from connected Google Sheets

## Local Development Setup

### Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.9+
- **Google Gemini API Key** (get one at https://aistudio.google.com/app/apikey)

### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file (optional)
# Add VITE_GOOGLE_CLIENT_ID for Google Slides integration
cp .env.example .env  # If you have one, or create manually

# Start development server
npm run dev
```


### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For testing

# Create environment file and add your Gemini API key
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY=your_key_here

# Start backend server
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at **http://localhost:8000**

### 3. Running the Full Application

You need **both** servers running:

1. **Terminal 1** (Frontend):

   ```bash
   npm run dev
   ```
2. **Terminal 2** (Backend):

   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```
3. Open **http://localhost:5173** in your browser

### Environment Variables

**Frontend** (`.env` in root directory):

```env
VITE_API_URL=http://localhost:8000          # Backend URL (default)
VITE_GOOGLE_CLIENT_ID=your_client_id        # For Google Slides integration (optional)
```

**Backend** (`backend/.env`):

```env
GEMINI_API_KEY=your_api_key_here            # Required
GEMINI_MODEL=gemini-3-flash-preview         # Optional (default shown)
CHARTS_DIR=static/charts                    # Optional (default shown)
```

### Running Tests

**Frontend Tests:**

```bash
npm test                  # Run tests in watch mode
npm run test:coverage     # Generate coverage report
```

**Backend Tests:**

```bash
cd backend
source venv/bin/activate
pytest                                        # Run all tests
pytest --cov=app --cov-report=term-missing   # With coverage
pytest tests/unit/test_schemas.py            # Run specific file
pytest -k "test_function_name"               # Run tests matching pattern
```

**Linting:**

```bash
cd backend
ruff check .           # Check code
ruff check --fix .     # Auto-fix issues
```

### Building for Production

```bash
# Frontend
npm run build          # Output to dist/

# Backend serves the built frontend automatically
# Just deploy the entire project with both frontend dist/ and backend/
```

## Usage

### 1. Connect Your Data (Optional)

**Option A: Upload CSV File**

- Click the upload area or drag & drop a CSV file
- Preview shows columns and sample rows

**Option B: Connect Google Sheet**

- Click **Data** button in header
- Click **Connect Google Sheet**
- Share your sheet publicly and paste the URL
- See [GOOGLE_SHEETS_GUIDE.md](./GOOGLE_SHEETS_GUIDE.md) for detailed instructions

**Option C: Add Manual Data**

- Click **Data** button in header
- Click **Add Manual Data**
- Paste CSV data directly

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

### 4. Your Work is Saved Automatically

- All data, charts, and conversations persist across sessions
- Close the browser and return anytime - everything will be there
- Use "Clear Chat" or "Clear All Data" buttons to reset when needed

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

**Frontend:**
- React + Vite
- PapaParse for CSV parsing
- html-to-image for chart export
- Lucide React for icons

**Backend:**
- Python FastAPI + LangGraph
- Google Gemini AI for natural language processing
- Seaborn + Matplotlib for chart generation
- Pandas for data manipulation

## Sample Data

A sample CSV is included at `public/sample-data.csv` with monthly revenue data.

## Future Enhancements

- [X] Connect to real AI API (OpenAI, Claude) for smarter chart generation
- [ ] Google Sheets API with OAuth (write access, auto-sync)
- [ ] Support Excel files (.xlsx)
- [ ] Column selection for custom chart mapping
- [ ] More chart types (scatter, heatmap, etc.)
- [ ] Chart customization (colors, labels, titles)
- [ ] Save/load chart configurations
- [ ] Real-time collaboration features
