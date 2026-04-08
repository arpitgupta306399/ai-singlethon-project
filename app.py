from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, current_user
from models import db, Admin, Student
from routes.auth import auth_bp
from routes.student import student_bp
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///futurehire.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
CORS(app)
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.admin_login'  # Default login view

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(student_bp, url_prefix='/api')

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    # Try admin first, then student
    user = Admin.query.get(int(user_id))
    if user:
        return user
    return Student.query.get(int(user_id))

# Create database tables
with app.app_context():
    db.create_all()

    # Create default admin if not exists
    if not Admin.query.filter_by(email='admin@futurehire.com').first():
        admin = Admin(name='System Admin', email='admin@futurehire.com')
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        logger.info("Default admin created: admin@futurehire.com / admin123")

# Legacy prediction endpoint for frontend compatibility
@app.route('/predict', methods=['POST'])
def predict():
    """
    Legacy prediction endpoint for frontend compatibility.
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    marks = data.get('marks', 0)
    attendance = data.get('attendance', 0)
    skills_count = data.get('skills_count', 0)
    projects = data.get('projects', 0)
    backlogs = data.get('backlogs', 0)
    user_skills = data.get('user_skills', [])

    # Calculate prediction
    probability = calculate_placement_probability(marks, attendance, skills_count, projects, backlogs)
    risk_level, warning_message = determine_risk_level(marks, backlogs)
    skill_gaps = detect_skill_gaps(user_skills)
    action_plan = generate_action_plan(marks, skill_gaps, backlogs, projects)
    result_explanation = generate_result_explanation(probability, marks, backlogs, len(skill_gaps), projects, attendance)

    return jsonify({
        "placement_probability": probability,
        "risk_level": risk_level,
        "risk_details": warning_message,
        "explanation": result_explanation,
        "missing_skills": skill_gaps,
        "required_skills": REQUIRED_SKILLS,
        "action_plan": action_plan
    })

# Import prediction functions for legacy endpoint
def calculate_placement_probability(marks, attendance, skills_count, projects, backlogs):
    marks_norm = marks
    attendance_norm = attendance
    skills_norm = min((skills_count / 10) * 100, 100)
    projects_norm = min((projects / 5) * 100, 100)

    weighted_score = (marks_norm * 0.30) + (attendance_norm * 0.15) + (skills_norm * 0.25) + (projects_norm * 0.20)
    penalty = backlogs * 10
    final_score = max(0, min(100, weighted_score - penalty))

    return round(final_score, 2)

def determine_risk_level(marks, backlogs):
    if backlogs > 2:
        return "High Risk", "High risk due to excessive backlogs. Consider clearing backlogs and improving academic performance."
    elif marks < 60:
        return "Medium Risk", "Medium risk due to low marks. Focus on improving academic scores."
    else:
        return "Low Risk", "Low risk. Good placement prospects."

REQUIRED_SKILLS = ["Python", "DSA", "DBMS", "OS", "System Design", "SQL", "Aptitude", "Communication"]

def detect_skill_gaps(user_skills):
    if not user_skills:
        return REQUIRED_SKILLS

    user_skills_lower = [skill.lower() for skill in user_skills]
    missing_skills = []

    for required_skill in REQUIRED_SKILLS:
        if required_skill.lower() not in user_skills_lower:
            missing_skills.append(required_skill)

    return missing_skills

def generate_result_explanation(probability, marks, backlogs, missing_skills_count, projects, attendance):
    if probability >= 75:
        base_msg = "Your score is excellent!"
    elif probability >= 60:
        base_msg = "Your score is good."
    elif probability >= 45:
        base_msg = "Your score is moderate."
    else:
        base_msg = "Your score is low."

    positive_factors = []
    if marks >= 75:
        positive_factors.append("strong academic performance")
    if projects >= 3:
        positive_factors.append("solid project portfolio")
    if attendance >= 85:
        positive_factors.append("excellent attendance")
    if backlogs == 0:
        positive_factors.append("no backlogs")

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

    explanation = base_msg

    if negative_factors:
        explanation += " This is primarily due to " + ", ".join(negative_factors) + "."

    if positive_factors:
        if negative_factors:
            explanation += " However, your " + ", ".join(positive_factors) + " work in your favor."
        else:
            explanation += " Your " + ", ".join(positive_factors) + " contribute positively to your profile."

    if probability < 50 and (backlogs > 0 or marks < 60):
        explanation += " Focus on clearing backlogs and improving your marks to boost placement chances."
    elif probability < 60 and missing_skills_count > 4:
        explanation += " Prioritize acquiring missing technical skills to enhance your profile."
    elif probability >= 75:
        explanation += " Keep up the excellent work!"

    return explanation

def generate_action_plan(marks, missing_skills, backlogs, projects):
    plan = {
        "month_1_2": {"title": "Foundation & Backlog Clearance", "tasks": []},
        "month_3_4": {"title": "Skill Development & Projects", "tasks": []},
        "month_5_6": {"title": "Polish & Interview Prep", "tasks": []}
    }

    if backlogs > 0:
        plan["month_1_2"]["tasks"].append(f"Clear {backlogs} backlog(s) - Priority 1")

    if marks < 60:
        plan["month_1_2"]["tasks"].append("Focus on improving academic marks - Target: 65+")
        plan["month_1_2"]["tasks"].append("Review core subjects and strengthen weak areas")
    else:
        plan["month_1_2"]["tasks"].append("Maintain current academic performance")

    foundational_skills = [s for s in missing_skills if s in ["Python", "Aptitude"]]
    if foundational_skills:
        plan["month_1_2"]["tasks"].append(f"Learn foundational skills: {', '.join(foundational_skills)}")

    plan["month_1_2"]["tasks"].append("Attend technical workshops and webinars")

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

    advanced_skills = [s for s in missing_skills if s in ["System Design", "OS", "Communication"]]
    if advanced_skills:
        plan["month_5_6"]["tasks"].append(f"Master advanced topics: {', '.join(advanced_skills)}")
    else:
        plan["month_5_6"]["tasks"].append("Advanced system design and architecture concepts")

    plan["month_5_6"]["tasks"].append("Mock interviews and aptitude tests")
    plan["month_5_6"]["tasks"].append("Polish resume with projects and achievements")
    plan["month_5_6"]["tasks"].append("Practice communication and soft skills")

    return plan

@app.route('/')
def home():
    return "FutureHire AI Backend - Running"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)