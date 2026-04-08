from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest
from models import db, Admin, Student
from utils.security import validate_email, validate_password, log_user_action
from flask_login import login_user, logout_user, login_required
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/admin/signup', methods=['POST'])
def admin_signup():
    """Admin signup endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # Validation
        if not name or len(name) < 2:
            return jsonify({"error": "Name must be at least 2 characters"}), 400
        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        if not validate_password(password):
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        # Check if admin already exists
        if Admin.query.filter_by(email=email).first():
            return jsonify({"error": "Admin with this email already exists"}), 409

        # Create admin
        admin = Admin(name=name, email=email)
        admin.set_password(password)

        db.session.add(admin)
        db.session.commit()

        log_user_action("admin_signup", admin.id, f"Email: {email}")
        logger.info(f"New admin created: {email}")

        return jsonify({
            "message": "Admin account created successfully",
            "admin": admin.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Admin signup error: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        admin = Admin.query.filter_by(email=email).first()
        if not admin or not admin.check_password(password):
            return jsonify({"error": "Invalid email or password"}), 401

        login_user(admin)
        admin.update_last_login()
        log_user_action("admin_login", admin.id)

        return jsonify({
            "message": "Admin login successful",
            "admin": admin.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Admin login error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/student/signup', methods=['POST'])
def student_signup():
    """Student signup endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # Validation
        if not name or len(name) < 2:
            return jsonify({"error": "Name must be at least 2 characters"}), 400
        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        if not validate_password(password):
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        # Check if student already exists
        if Student.query.filter_by(email=email).first():
            return jsonify({"error": "Student with this email already exists"}), 409

        # Create student
        student = Student(name=name, email=email)
        student.set_password(password)

        db.session.add(student)
        db.session.commit()

        log_user_action("student_signup", student.id, f"Email: {email}")
        logger.info(f"New student created: {email}")

        return jsonify({
            "message": "Student account created successfully",
            "student": student.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Student signup error: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/student/login', methods=['POST'])
def student_login():
    """Student login endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        student = Student.query.filter_by(email=email).first()
        if not student or not student.check_password(password):
            return jsonify({"error": "Invalid email or password"}), 401

        login_user(student)
        student.update_last_login()
        log_user_action("student_login", student.id)

        return jsonify({
            "message": "Student login successful",
            "student": student.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Student login error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout endpoint for both admin and student"""
    try:
        user_id = current_user.id
        logout_user()
        log_user_action("logout", user_id)
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500