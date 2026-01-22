# Google Sheets Connection Guide

## How to Connect Your Google Sheet

### Step 1: Prepare Your Sheet
1. Open your Google Sheet in your browser
2. Make sure your data has:
   - A header row with column names
   - Numeric columns for chart values
   - Text columns for labels (dates, categories, etc.)

### Step 2: Make Sheet Public
1. Click the **Share** button (top right)
2. Click **Change to anyone with the link**
3. Set permission to **Viewer**
4. Click **Done**

### Step 3: Get the URL
- Copy the URL from your browser's address bar
- It should look like: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0`

### Step 4: Connect in Slides AI
1. Go to **Data Management** (click Data button in header)
2. Click **Connect Google Sheet**
3. (Optional) Enter a name for your dataset
4. Paste the Google Sheets URL
5. Click **Connect Sheet**

### Step 5: Use Your Data
- Once connected, your sheet appears in the datasets list
- Click **Use** to activate it for chart generation
- Click the **Refresh** button (🔄) anytime to sync latest data

## Supported URL Formats

The app supports various Google Sheets URL formats:

```
✅ https://docs.google.com/spreadsheets/d/SHEET_ID/edit
✅ https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
✅ https://docs.google.com/spreadsheets/d/SHEET_ID/edit?usp=sharing
✅ https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=123456
```

## Connecting to Specific Tabs

If your sheet has multiple tabs:
1. Click on the tab you want to use
2. The URL will include `#gid=NUMBER`
3. Copy and paste this URL
4. The app will fetch data from that specific tab

## Refreshing Data

Your Google Sheet data is fetched when you connect. To get the latest data:
1. Make changes in your Google Sheet
2. Go to Data Management in Slides AI
3. Click the **Refresh** button (🔄) next to your dataset
4. Data will be re-fetched and updated

## Troubleshooting

### "Failed to fetch sheet" Error
- **Cause**: Sheet is not publicly accessible
- **Solution**: Make sure sharing is set to "Anyone with the link can view"

### "Invalid Google Sheets URL" Error
- **Cause**: URL format not recognized
- **Solution**: Copy the URL directly from your browser while viewing the sheet

### Data Not Updating
- **Cause**: Using cached data
- **Solution**: Click the Refresh button to fetch latest data

### Wrong Tab Data
- **Cause**: URL points to different tab
- **Solution**: Click the correct tab in Google Sheets before copying URL

## Example Sheet Structure

```csv
Month,Revenue,Expenses,Profit
January,45000,32000,13000
February,52000,35000,17000
March,48000,33000,15000
April,55000,36000,19000
May,58000,37000,21000
```

## Privacy & Security

- Your sheet must be publicly accessible (anyone with link can view)
- Data is fetched directly from Google's servers
- No data is stored on our servers
- Connection is read-only - we cannot modify your sheet
- You can revoke access anytime by changing sheet permissions

## Tips

1. **Keep it Simple**: Use clean, well-structured data with clear headers
2. **Test First**: Try with a small test sheet before connecting important data
3. **Refresh Regularly**: Click refresh before generating charts to ensure latest data
4. **Multiple Sheets**: You can connect multiple sheets and switch between them
5. **Specific Tabs**: Connect different tabs as separate datasets for organization
