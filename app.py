from flask import Flask, request, jsonify

app = Flask(__name__)

def calculate_placement_probability(marks, attendance, skills_count, projects, backlogs):
    # Normalize scores to 0-100
    marks_norm = marks
    attendance_norm = attendance
    skills_norm = min((skills_count / 10) * 100, 100)  # Assuming max 10 skills
    projects_norm = min((projects / 5) * 100, 100)    # Assuming max 5 projects
    
    # Calculate weighted score
    weighted_score = (marks_norm * 0.30) + (attendance_norm * 0.15) + (skills_norm * 0.25) + (projects_norm * 0.20)
    
    # Subtract penalty for backlogs (10 points per backlog)
    penalty = backlogs * 10
    final_score = max(0, min(100, weighted_score - penalty))
    
    return round(final_score, 2)

def determine_risk_level(marks, backlogs):
    if backlogs > 2:
        risk_level = "High Risk"
        warning_message = "High risk due to excessive backlogs. Consider clearing backlogs and improving academic performance."
    elif marks < 60:
        risk_level = "Medium Risk"
        warning_message = "Medium risk due to low marks. Focus on improving academic scores."
    else:
        risk_level = "Low Risk"
        warning_message = "Low risk. Good placement prospects."
    
    return risk_level, warning_message

@app.route('/')
def home():
    return "Backend Running"

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    marks = data.get('marks', 0)
    attendance = data.get('attendance', 0)
    skills_count = data.get('skills_count', 0)
    projects = data.get('projects', 0)
    backlogs = data.get('backlogs', 0)
    
    probability = calculate_placement_probability(marks, attendance, skills_count, projects, backlogs)
    risk_level, warning_message = determine_risk_level(marks, backlogs)
    
    return jsonify({
        "placement_probability": probability,
        "risk_level": risk_level,
        "warning_message": warning_message
    })

if __name__ == '__main__':
    app.run(debug=True)