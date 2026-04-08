import requests
import json

# Create a session to maintain cookies
session = requests.Session()

# Test admin login
admin_login_url = 'http://localhost:5000/api/auth/admin/login'
admin_data = {'email': 'admin@futurehire.com', 'password': 'admin123'}
headers = {'Content-Type': 'application/json'}

try:
    # Admin login
    admin_response = session.post(admin_login_url, json=admin_data, headers=headers)
    print(f'Admin Login - Status Code: {admin_response.status_code}')
    if admin_response.status_code == 200:
        print('Admin login successful!')

    # Get all students (admin only) - should work now with session
    students_url = 'http://localhost:5000/api/students'
    students_response = session.get(students_url, headers=headers)
    print(f'Get All Students - Status Code: {students_response.status_code}')
    if students_response.status_code == 200:
        students_data = students_response.json()
        print(f'Found {students_data.get("count", 0)} students')

    # Get specific student
    student_url = 'http://localhost:5000/api/student/1'
    student_response = session.get(student_url, headers=headers)
    print(f'Get Student 1 - Status Code: {student_response.status_code}')
    if student_response.status_code == 200:
        print('Student data retrieved successfully!')

except Exception as e:
    print(f'Error: {e}')