#!/usr/bin/env python3
"""
FutureHire AI Backend Test Script
Tests all major functionality to ensure the system is working correctly.
"""

import requests
import json
import sys

BASE_URL = 'http://localhost:5001'
HEADERS = {'Content-Type': 'application/json'}

def test_prediction():
    """Test the AI prediction endpoint"""
    print("🧠 Testing AI Prediction...")
    url = f'{BASE_URL}/predict'
    data = {
        'marks': 85,
        'attendance': 90,
        'skills_count': 6,
        'projects': 3,
        'backlogs': 0,
        'user_skills': ['Python', 'DSA', 'SQL']
    }

    try:
        response = requests.post(url, json=data, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            result = response.json()
            probability = result.get('placement_probability', 0)
            print(f"✅ Prediction successful: {probability}% placement probability")
            return True
        else:
            print(f"❌ Prediction failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return False

def test_admin_auth():
    """Test admin authentication"""
    print("🔐 Testing Admin Authentication...")
    url = f'{BASE_URL}/api/auth/admin/login'
    data = {'email': 'admin@futurehire.com', 'password': 'admin123'}

    try:
        response = requests.post(url, json=data, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            print("✅ Admin login successful")
            return True
        else:
            print(f"❌ Admin login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Admin auth error: {e}")
        return False

def test_student_auth():
    """Test student authentication"""
    print("👨‍🎓 Testing Student Authentication...")

    # First signup
    signup_url = f'{BASE_URL}/api/auth/student/signup'
    signup_data = {
        'name': 'Test Student',
        'email': 'test@example.com',
        'password': 'test123',
        'marks': 85,
        'attendance': 90,
        'skills_count': 6,
        'projects': 3,
        'backlogs': 0,
        'user_skills': ['Python', 'DSA', 'SQL']
    }

    try:
        signup_response = requests.post(signup_url, json=signup_data, headers=HEADERS, timeout=10)
        if signup_response.status_code not in [200, 201, 409]:  # 409 means already exists
            print(f"❌ Student signup failed: {signup_response.status_code} - {signup_response.text}")
            return False

        # Then login
        login_url = f'{BASE_URL}/api/auth/student/login'
        login_data = {'email': 'test@example.com', 'password': 'test123'}

        login_response = requests.post(login_url, json=login_data, headers=HEADERS, timeout=10)
        if login_response.status_code == 200:
            print("✅ Student authentication successful")
            return True
        else:
            print(f"❌ Student login failed: {login_response.status_code} - {login_response.text}")
            return False
    except Exception as e:
        print(f"❌ Student auth error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 FutureHire AI Backend Test Suite")
    print("=" * 40)

    tests = [
        test_prediction,
        test_admin_auth,
        test_student_auth
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1
        print()

    print("=" * 40)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All systems operational! Backend is working perfectly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())