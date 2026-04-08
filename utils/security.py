from functools import wraps
from flask import jsonify, request, current_app
from flask_login import current_user, login_required
from models import Admin, Student
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not isinstance(current_user, Admin):
            logger.warning(f"Unauthorized admin access attempt by user {current_user.id}")
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function

def student_required(f):
    """Decorator to require student role"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not isinstance(current_user, Student):
            logger.warning(f"Unauthorized student access attempt by user {current_user.id}")
            return jsonify({"error": "Student access required"}), 403
        return f(*args, **kwargs)
    return decorated_function

def admin_or_self_required(f):
    """Decorator to allow admin or self-access for student data"""
    @wraps(f)
    @login_required
    def decorated_function(student_id, *args, **kwargs):
        if isinstance(current_user, Admin):
            return f(student_id, *args, **kwargs)
        elif isinstance(current_user, Student) and current_user.id == int(student_id):
            return f(student_id, *args, **kwargs)
        else:
            logger.warning(f"Unauthorized access to student {student_id} by user {current_user.id}")
            return jsonify({"error": "Access denied"}), 403
    return decorated_function

def validate_email(email):
    """Basic email validation"""
    return '@' in email and '.' in email and len(email) > 5

def validate_password(password):
    """Password validation - minimum 6 characters"""
    return len(password) >= 6

def log_user_action(action, user_id, details=None):
    """Log user actions for audit trail"""
    logger.info(f"User {user_id} performed: {action}" + (f" - {details}" if details else ""))

def get_current_user_role():
    """Get current user's role"""
    if not current_user.is_authenticated:
        return None
    if isinstance(current_user, Admin):
        return 'admin'
    elif isinstance(current_user, Student):
        return 'student'
    return None