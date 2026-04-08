# AI Placement Predictor - API Documentation

## Overview
Comprehensive REST API for predicting student placement probability and generating personalized development plans.

## Base URL
```
http://localhost:5000
```

## Endpoints

### 1. Health Check
**GET** `/`
- Returns: Backend status message

**Response:**
```
Backend Running
```

### 2. Placement Prediction & Analysis
**POST** `/predict`

#### Request
```json
{
  "marks": 72,
  "attendance": 88,
  "skills_count": 4,
  "projects": 2,
  "backlogs": 1,
  "user_skills": ["Python", "SQL", "DSA"]
}
```

#### Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| marks | int | Student's marks (0-100) | 0 |
| attendance | int | Attendance percentage (0-100) | 0 |
| skills_count | int | Number of technical skills | 0 |
| projects | int | Number of projects completed | 0 |
| backlogs | int | Number of academic backlogs | 0 |
| user_skills | array | List of skills acquired | [] |

#### Response
```json
{
  "placement_probability": 42.8,
  "risk_level": "Low Risk",
  "risk_details": "Low risk. Good placement prospects.",
  "explanation": "Your score is low. This is primarily due to 1 backlog(s), insufficient technical skills. However, your excellent attendance work in your favor. Focus on clearing backlogs and improving your marks to boost placement chances.",
  "missing_skills": [
    "DBMS",
    "OS",
    "System Design",
    "Aptitude",
    "Communication"
  ],
  "required_skills": [
    "Python",
    "DSA",
    "DBMS",
    "OS",
    "System Design",
    "SQL",
    "Aptitude",
    "Communication"
  ],
  "action_plan": {
    "month_1_2": {
      "title": "Foundation & Backlog Clearance",
      "tasks": [
        "Clear 1 backlog(s) - Priority 1",
        "Maintain current academic performance",
        "Learn foundational skills: Aptitude",
        "Attend technical workshops and webinars"
      ]
    },
    "month_3_4": {
      "title": "Skill Development & Projects",
      "tasks": [
        "Deep dive into: DBMS",
        "Complete 1 real-world projects",
        "Practice coding problems on LeetCode/HackerRank"
      ]
    },
    "month_5_6": {
      "title": "Polish & Interview Prep",
      "tasks": [
        "Master advanced topics: OS, System Design, Communication",
        "Mock interviews and aptitude tests",
        "Polish resume with projects and achievements",
        "Practice communication and soft skills"
      ]
    }
  }
}
```

## Response Fields

### placement_probability (float)
- Weighted score calculated as:
  - Marks: 30% weight
  - Attendance: 15% weight
  - Skills: 25% weight (normalized from count/10)
  - Projects: 20% weight (normalized from count/5)
  - Backlogs: -10 points per backlog
- Range: 0-100

### risk_level (string)
- **High Risk**: Backlogs > 2
- **Medium Risk**: Marks < 60 (and backlogs ≤ 2)
- **Low Risk**: Otherwise

### explanation (string)
- Dynamic, personalized explanation based on:
  - Placement score range
  - Positive factors identified
  - Negative factors identified
  - Actionable recommendations

### missing_skills (array)
- List of required skills not in user_skills
- Case-insensitive matching

### required_skills (array)
- All 8 essential skills for placement:
  - Python
  - DSA (Data Structures & Algorithms)
  - DBMS (Database Management Systems)
  - OS (Operating Systems)
  - System Design
  - SQL
  - Aptitude
  - Communication

### action_plan (object)
- **month_1_2**: Foundation & Backlog Clearance
- **month_3_4**: Skill Development & Projects
- **month_5_6**: Polish & Interview Prep
- Each phase contains customized tasks based on student profile

## Error Handling

### 400 Bad Request
```json
{
  "error": "No JSON data provided"
}
```

## Example Usage

### cURL
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "marks": 75,
    "attendance": 85,
    "skills_count": 5,
    "projects": 3,
    "backlogs": 0,
    "user_skills": ["Python", "SQL", "DSA", "DBMS", "Aptitude"]
  }'
```

### Python
```python
import requests

url = 'http://localhost:5000/predict'
data = {
    'marks': 75,
    'attendance': 85,
    'skills_count': 5,
    'projects': 3,
    'backlogs': 0,
    'user_skills': ['Python', 'SQL', 'DSA', 'DBMS', 'Aptitude']
}

response = requests.post(url, json=data)
result = response.json()
print(result)
```

### JavaScript (Fetch API)
```javascript
const data = {
  marks: 75,
  attendance: 85,
  skills_count: 5,
  projects: 3,
  backlogs: 0,
  user_skills: ['Python', 'SQL', 'DSA', 'DBMS', 'Aptitude']
};

fetch('http://localhost:5000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
  .then(res => res.json())
  .then(result => console.log(result));
```

## Features Integrated

✅ **Placement Probability Calculation** - Weighted scoring algorithm  
✅ **Risk Level Assessment** - Based on backlogs and marks  
✅ **Skill Gap Detection** - Identifies missing technical skills  
✅ **Action Plan Generation** - 6-month personalized roadmap  
✅ **Result Explanation** - Dynamic, human-readable feedback

## Notes

- All numerical inputs should be valid numbers
- user_skills array is case-insensitive
- Response is always JSON (except for `/` endpoint)
- HTTP Status: 200 for success, 400 for errors
