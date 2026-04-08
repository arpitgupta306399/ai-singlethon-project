# Frontend-Backend Integration Guide

## ✅ Integration Complete!

The frontend and backend are now fully connected.

## Running the Application

### Step 1: Start the Backend Server
```bash
cd c:\Users\Arpit Gupta\OneDrive\Desktop\singlethon
python app.py
```
Backend runs on: **http://localhost:5000**

### Step 2: Start the Frontend Server
```bash
cd c:\Users\Arpit Gupta\OneDrive\Desktop\singlethon\templatess
python -m http.server 8001
```
Frontend runs on: **http://localhost:8001**

### Step 3: Access the Application
Open your browser and go to:
```
http://localhost:8001
```

## What Was Changed

### Backend (app.py)
✅ Added CORS support using `flask-cors`
- Enables cross-origin requests from frontend
- Allows frontend on port 8001 to communicate with backend on port 5000

### Frontend (script.js)
✅ Updated dashboard form to call backend API
- Sends student data to `http://localhost:5000/predict`
- Receives comprehensive analysis including:
  - Placement probability
  - Risk level
  - Missing skills
  - Dynamic explanation
  - 6-month action plan

✅ Updated result page to display backend data
- Shows API results instead of local calculations
- Falls back to local calculation if API fails

## Data Flow

```
User fills form on Dashboard
        ↓
Frontend validates & sends to API
        ↓
Backend /predict endpoint processes
        ↓
Backend returns comprehensive analysis
        ↓
Frontend displays results on Results page
```

## Request Format To Backend

```json
{
  "name": "John Doe",
  "marks": 75,
  "attendance": 85,
  "backlogs": 1,
  "skills_count": 4,
  "projects": 2,
  "user_skills": ["Python", "SQL", "DSA", "Aptitude"]
}
```

## Response From Backend

```json
{
  "placement_probability": 43.25,
  "risk_level": "Low Risk",
  "risk_details": "Low risk. Good placement prospects.",
  "explanation": "Your score is low. This is primarily due to 1 backlog(s), insufficient technical skills...",
  "missing_skills": ["DBMS", "OS", "System Design", "Communication"],
  "required_skills": ["Python", "DSA", "DBMS", "OS", "System Design", "SQL", "Aptitude", "Communication"],
  "action_plan": {
    "month_1_2": {...},
    "month_3_4": {...},
    "month_5_6": {...}
  }
}
```

## Dependencies

### Backend
- Flask 2.3.3
- flask-cors 4.0.0

### Frontend
- No additional dependencies (uses vanilla JavaScript)

## Troubleshooting

### "Can't reach backend" error
- Make sure backend is running: `python app.py`
- Check if port 5000 is available

### CORS Error
- Backend should have CORS properly initialized
- If issue persists, restart backend server

### Results not updating
- Clear browser cache
- Check browser console for errors
- Verify both servers are running

## Features Working

✅ Form submission from dashboard
✅ API call to backend /predict endpoint
✅ Display of placement probability
✅ Risk level assessment
✅ Missing skills identification
✅ Dynamic explanation generation
✅ 6-month action plan display
✅ Page navigation with results persistence
