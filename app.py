from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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

REQUIRED_SKILLS = ["Python", "DSA", "DBMS", "OS", "System Design", "SQL", "Aptitude", "Communication"]

def detect_skill_gaps(user_skills):
    """
    Compare user skills with required skills and return missing skills.
    
    Args:
        user_skills: List of skills the user has
    
    Returns:
        List of missing skills
    """
    if not user_skills:
        return REQUIRED_SKILLS
    
    # Convert user skills to lowercase for case-insensitive comparison
    user_skills_lower = [skill.lower() for skill in user_skills]
    missing_skills = []
    
    for required_skill in REQUIRED_SKILLS:
        if required_skill.lower() not in user_skills_lower:
            missing_skills.append(required_skill)
    
    return missing_skills

def generate_action_plan(marks, missing_skills, backlogs, projects):
    """
    Generate a personalized 6-month action plan based on student profile.
    
    Args:
        marks: Student's current marks
        missing_skills: List of missing skills
        backlogs: Number of backlogs
        projects: Number of projects completed
    
    Returns:
        Dictionary with structured 6-month action plan
    """
    plan = {
        "month_1_2": {"title": "Foundation & Backlog Clearance", "tasks": []},
        "month_3_4": {"title": "Skill Development & Projects", "tasks": []},
        "month_5_6": {"title": "Polish & Interview Prep", "tasks": []}
    }
    
    # Month 1-2 Tasks
    if backlogs > 0:
        plan["month_1_2"]["tasks"].append(f"Clear {backlogs} backlog(s) - Priority 1")
    
    if marks < 60:
        plan["month_1_2"]["tasks"].append("Focus on improving academic marks - Target: 65+")
        plan["month_1_2"]["tasks"].append("Review core subjects and strengthen weak areas")
    else:
        plan["month_1_2"]["tasks"].append("Maintain current academic performance")
    
    # Add foundational skills to Month 1-2
    foundational_skills = [s for s in missing_skills if s in ["Python", "Aptitude"]]
    if foundational_skills:
        plan["month_1_2"]["tasks"].append(f"Learn foundational skills: {', '.join(foundational_skills)}")
    
    plan["month_1_2"]["tasks"].append("Attend technical workshops and webinars")
    
    # Month 3-4 Tasks
    intermediate_skills = [s for s in missing_skills if s in ["DSA", "DBMS", "SQL"]]
    if intermediate_skills:
        plan["month_3_4"]["tasks"].append(f"Deep dive into: {', '.join(intermediate_skills)}")
    else:
        plan["month_3_4"]["tasks"].append("Advanced problem-solving in DSA and databases")
    
    if projects < 3:
        plan["month_3_4"]["tasks"].append(f"Complete {3 - projects} real-world projects")
    else:
        plan["month_3_4"]["tasks"].append("Work on advanced projects with industry relevance")
    
    plan["month_3_4"]["tasks"].append("Practice coding problems on LeetCode/HackerRank")
    
    # Month 5-6 Tasks
    advanced_skills = [s for s in missing_skills if s in ["System Design", "OS", "Communication"]]
    if advanced_skills:
        plan["month_5_6"]["tasks"].append(f"Master advanced topics: {', '.join(advanced_skills)}")
    else:
        plan["month_5_6"]["tasks"].append("Advanced system design and architecture concepts")
    
    plan["month_5_6"]["tasks"].append("Mock interviews and aptitude tests")
    plan["month_5_6"]["tasks"].append("Polish resume with projects and achievements")
    plan["month_5_6"]["tasks"].append("Practice communication and soft skills")
    
    return plan

def generate_result_explanation(probability, marks, backlogs, missing_skills_count, projects, attendance):
    """
    Generate a dynamic explanation for the placement probability result.
    
    Args:
        probability: Placement probability score
        marks: Student's marks
        backlogs: Number of backlogs
        missing_skills_count: Number of missing skills
        projects: Number of projects completed
        attendance: Attendance percentage
    
    Returns:
        A dynamic explanation string
    """
    factors = []
    
    # Analyze score range
    if probability >= 75:
        base_msg = "Your score is excellent!"
    elif probability >= 60:
        base_msg = "Your score is good."
    elif probability >= 45:
        base_msg = "Your score is moderate."
    else:
        base_msg = "Your score is low."
    
    # Identify positive factors
    positive_factors = []
    if marks >= 75:
        positive_factors.append("strong academic performance")
    if projects >= 3:
        positive_factors.append("solid project portfolio")
    if attendance >= 85:
        positive_factors.append("excellent attendance")
    if backlogs == 0:
        positive_factors.append("no backlogs")
    
    # Identify negative factors
    negative_factors = []
    if backlogs > 0:
        negative_factors.append(f"{backlogs} backlog(s)")
    if marks < 60:
        negative_factors.append("low academic marks")
    if missing_skills_count > 4:
        negative_factors.append("insufficient technical skills")
    if projects < 2:
        negative_factors.append("limited project experience")
    if attendance < 75:
        negative_factors.append("low attendance")
    
    # Build explanation
    explanation = base_msg
    
    if negative_factors:
        explanation += " This is primarily due to " + ", ".join(negative_factors) + "."
    
    if positive_factors:
        if negative_factors:
            explanation += " However, your " + ", ".join(positive_factors) + " work in your favor."
        else:
            explanation += " Your " + ", ".join(positive_factors) + " contribute positively to your profile."
    
    # Add actionable insight
    if probability < 50 and (backlogs > 0 or marks < 60):
        explanation += " Focus on clearing backlogs and improving your marks to boost placement chances."
    elif probability < 60 and missing_skills_count > 4:
        explanation += " Prioritize acquiring missing technical skills to enhance your profile."
    elif probability >= 75:
        explanation += " Keep up the excellent work!"
    
    return explanation

@app.route('/')
def home():
    return "Backend Running"

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict placement probability and generate comprehensive student profile analysis.
    
    Input JSON:
    {
        "marks": int,
        "attendance": int,
        "skills_count": int,
        "projects": int,
        "backlogs": int,
        "user_skills": list of strings
    }
    
    Returns: Comprehensive prediction analysis with action plan
    """
    data = request.get_json()
    
    # Input validation
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    marks = data.get('marks', 0)
    attendance = data.get('attendance', 0)
    skills_count = data.get('skills_count', 0)
    projects = data.get('projects', 0)
    backlogs = data.get('backlogs', 0)
    user_skills = data.get('user_skills', [])
    
    # Calculate all metrics
    probability = calculate_placement_probability(marks, attendance, skills_count, projects, backlogs)
    risk_level, warning_message = determine_risk_level(marks, backlogs)
    skill_gaps = detect_skill_gaps(user_skills)
    action_plan = generate_action_plan(marks, skill_gaps, backlogs, projects)
    explanation = generate_result_explanation(probability, marks, backlogs, len(skill_gaps), projects, attendance)
    
    # Return clean, structured JSON response
    return jsonify({
        "placement_probability": probability,
        "risk_level": risk_level,
        "risk_details": warning_message,
        "explanation": explanation,
        "missing_skills": skill_gaps,
        "required_skills": REQUIRED_SKILLS,
        "action_plan": action_plan
    })

if __name__ == '__main__':
    app.run(debug=True)