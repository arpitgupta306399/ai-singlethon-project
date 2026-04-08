from flask import Blueprint, request, jsonify
from models import db, Student
from utils.security import admin_required, admin_or_self_required, log_user_action
from flask_login import current_user
import json
import logging

logger = logging.getLogger(__name__)
student_bp = Blueprint('student', __name__)

# Import prediction functions from main app
def calculate_placement_probability(marks, attendance, skills_count, projects, backlogs):
    """Weighted scoring calculation"""
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

def detect_skill_gaps(user_skills):
    REQUIRED_SKILLS = ["Python", "DSA", "DBMS", "OS", "System Design", "SQL", "Aptitude", "Communication"]
    if not user_skills:
        return REQUIRED_SKILLS

    user_skills_lower = [skill.lower() for skill in user_skills]
    missing_skills = []

    for required_skill in REQUIRED_SKILLS:
        if required_skill.lower() not in user_skills_lower:
            missing_skills.append(required_skill)

    return missing_skills

def generate_result_explanation(probability, marks, backlogs, missing_skills_count, projects, attendance):
    factors = []

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

@student_bp.route('/students', methods=['GET'])
@admin_required
def get_all_students():
    """Get all students - Admin only"""
    try:
        students = Student.query.all()
        return jsonify({
            "students": [student.to_dict() for student in students],
            "count": len(students)
        }), 200
    except Exception as e:
        logger.error(f"Error fetching students: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@student_bp.route('/student/<int:student_id>', methods=['GET'])
@admin_or_self_required
def get_student(student_id):
    """Get specific student - Admin or self"""
    try:
        student = Student.query.get_or_404(student_id)

        # Parse skills if stored as JSON or comma-separated
        try:
            skills_list = json.loads(student.skills) if student.skills.startswith('[') else student.skills.split(',')
            skills_list = [s.strip() for s in skills_list if s.strip()]
        except:
            skills_list = [s.strip() for s in student.skills.split(',') if s.strip()]

        # Calculate prediction
        probability = calculate_placement_probability(
            student.marks, student.attendance, len(skills_list),
            student.projects, student.backlogs
        )
        risk_level, risk_details = determine_risk_level(student.marks, student.backlogs)
        missing_skills = detect_skill_gaps(skills_list)
        explanation = generate_result_explanation(
            probability, student.marks, student.backlogs,
            len(missing_skills), student.projects, student.attendance
        )
        action_plan = generate_action_plan(student.marks, missing_skills, student.backlogs, student.projects)

        student_data = student.to_dict()
        student_data['prediction'] = {
            'placement_probability': probability,
            'risk_level': risk_level,
            'risk_details': risk_details,
            'explanation': explanation,
            'missing_skills': missing_skills,
            'action_plan': action_plan
        }

        log_user_action("view_student", current_user.id, f"Student ID: {student_id}")
        return jsonify({"student": student_data}), 200

    except Exception as e:
        logger.error(f"Error fetching student {student_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@student_bp.route('/student/<int:student_id>', methods=['PUT'])
@admin_or_self_required
def update_student(student_id):
    """Update student data - Admin or self"""
    try:
        student = Student.query.get_or_404(student_id)
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update allowed fields
        allowed_fields = ['name', 'marks', 'attendance', 'skills', 'projects', 'backlogs', 'consistency_score']
        for field in allowed_fields:
            if field in data:
                if field == 'skills':
                    # Store as JSON array if list, otherwise as string
                    if isinstance(data[field], list):
                        setattr(student, field, json.dumps(data[field]))
                    else:
                        setattr(student, field, str(data[field]))
                else:
                    setattr(student, field, data[field])

        db.session.commit()
        log_user_action("update_student", current_user.id, f"Student ID: {student_id}")

        return jsonify({
            "message": "Student updated successfully",
            "student": student.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Error updating student {student_id}: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@student_bp.route('/student/<int:student_id>', methods=['DELETE'])
@admin_required
def delete_student(student_id):
    """Delete student - Admin only"""
    try:
        student = Student.query.get_or_404(student_id)

        db.session.delete(student)
        db.session.commit()

        log_user_action("delete_student", current_user.id, f"Student ID: {student_id}")
        logger.info(f"Student {student_id} deleted by admin {current_user.id}")

        return jsonify({"message": "Student deleted successfully"}), 200

    except Exception as e:
        logger.error(f"Error deleting student {student_id}: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@student_bp.route('/student/<int:student_id>/predict', methods=['GET'])
@admin_or_self_required
def get_student_prediction(student_id):
    """Get prediction for specific student - Admin or self"""
    try:
        student = Student.query.get_or_404(student_id)

        # Parse skills
        try:
            skills_list = json.loads(student.skills) if student.skills.startswith('[') else student.skills.split(',')
            skills_list = [s.strip() for s in skills_list if s.strip()]
        except:
            skills_list = [s.strip() for s in student.skills.split(',') if s.strip()]

        # Generate prediction
        probability = calculate_placement_probability(
            student.marks, student.attendance, len(skills_list),
            student.projects, student.backlogs
        )
        risk_level, risk_details = determine_risk_level(student.marks, student.backlogs)
        missing_skills = detect_skill_gaps(skills_list)
        explanation = generate_result_explanation(
            probability, student.marks, student.backlogs,
            len(missing_skills), student.projects, student.attendance
        )
        action_plan = generate_action_plan(student.marks, missing_skills, student.backlogs, student.projects)

        prediction_data = {
            'placement_probability': probability,
            'risk_level': risk_level,
            'risk_details': risk_details,
            'explanation': explanation,
            'missing_skills': missing_skills,
            'action_plan': action_plan
        }

        log_user_action("get_prediction", current_user.id, f"Student ID: {student_id}")
        return jsonify({"prediction": prediction_data}), 200

    except Exception as e:
        logger.error(f"Error generating prediction for student {student_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500