#!/usr/bin/env python3
"""
StopFrauda Backend API Test Suite
Tests all backend endpoints for the StopFrauda scam detection app
"""

import requests
import json
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Get backend URL from environment
BACKEND_URL = "https://call-screen-test.preview.emergentagent.com/api"

class StopFraudaAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_user_id = None
        self.test_call_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
            
    def test_health_check(self):
        """Test GET /api/health"""
        try:
            response = self.make_request("GET", "/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "running" and "services" in data:
                    self.log_test("Health Check", True, f"API is running, version: {data.get('version', 'unknown')}", data)
                else:
                    self.log_test("Health Check", False, f"Invalid health response format: {data}")
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            
    def test_create_user(self):
        """Test POST /api/users"""
        try:
            user_data = {
                "phone": "+37369123456",
                "language": "en"
            }
            
            response = self.make_request("POST", "/users", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("phone") == user_data["phone"]:
                    self.test_user_id = data["id"]
                    self.log_test("Create User", True, f"User created with ID: {self.test_user_id}", data)
                else:
                    self.log_test("Create User", False, f"Invalid user response format: {data}")
            else:
                self.log_test("Create User", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create User", False, f"Exception: {str(e)}")
            
    def test_get_user(self):
        """Test GET /api/users/{user_id}"""
        if not self.test_user_id:
            self.log_test("Get User", False, "No test user ID available")
            return
            
        try:
            response = self.make_request("GET", f"/users/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.test_user_id:
                    self.log_test("Get User", True, f"Retrieved user: {data.get('phone')}", data)
                else:
                    self.log_test("Get User", False, f"User ID mismatch: {data}")
            else:
                self.log_test("Get User", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get User", False, f"Exception: {str(e)}")
            
    def test_update_user(self):
        """Test PUT /api/users/{user_id}"""
        if not self.test_user_id:
            self.log_test("Update User", False, "No test user ID available")
            return
            
        try:
            update_data = {
                "language": "ro",
                "onboarding_completed": True
            }
            
            response = self.make_request("PUT", f"/users/{self.test_user_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("language") == "ro" and data.get("onboarding_completed") == True:
                    self.log_test("Update User", True, "User updated successfully", data)
                else:
                    self.log_test("Update User", False, f"Update not reflected: {data}")
            else:
                self.log_test("Update User", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Update User", False, f"Exception: {str(e)}")
            
    def test_add_emergency_contacts(self):
        """Test POST /api/users/{user_id}/contacts"""
        if not self.test_user_id:
            self.log_test("Add Emergency Contacts", False, "No test user ID available")
            return
            
        try:
            contacts = [
                {
                    "name": "Maria Popescu",
                    "phone": "+37369987654"
                },
                {
                    "name": "Ion Ionescu", 
                    "phone": "+37369876543"
                }
            ]
            
            response = self.make_request("POST", f"/users/{self.test_user_id}/contacts", json=contacts)
            
            if response.status_code == 200:
                data = response.json()
                if len(data.get("emergency_contacts", [])) == 2:
                    self.log_test("Add Emergency Contacts", True, f"Added {len(contacts)} contacts", data)
                else:
                    self.log_test("Add Emergency Contacts", False, f"Contact count mismatch: {data}")
            else:
                self.log_test("Add Emergency Contacts", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Add Emergency Contacts", False, f"Exception: {str(e)}")
            
    def test_get_emergency_contacts(self):
        """Test GET /api/users/{user_id}/contacts"""
        if not self.test_user_id:
            self.log_test("Get Emergency Contacts", False, "No test user ID available")
            return
            
        try:
            response = self.make_request("GET", f"/users/{self.test_user_id}/contacts")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_test("Get Emergency Contacts", True, f"Retrieved {len(data)} contacts", data)
                else:
                    self.log_test("Get Emergency Contacts", False, f"No contacts found: {data}")
            else:
                self.log_test("Get Emergency Contacts", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Emergency Contacts", False, f"Exception: {str(e)}")
            
    def test_create_call_record(self):
        """Test POST /api/calls"""
        if not self.test_user_id:
            self.log_test("Create Call Record", False, "No test user ID available")
            return
            
        try:
            call_data = {
                "user_id": self.test_user_id,
                "caller_number": "+37322555666",
                "duration_seconds": 120,
                "transcript": "Hello, this is from your bank. We need to verify your account details immediately."
            }
            
            response = self.make_request("POST", "/calls", json=call_data)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("user_id") == self.test_user_id:
                    self.test_call_id = data["id"]
                    self.log_test("Create Call Record", True, f"Call created with ID: {self.test_call_id}", data)
                else:
                    self.log_test("Create Call Record", False, f"Invalid call response: {data}")
            else:
                self.log_test("Create Call Record", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create Call Record", False, f"Exception: {str(e)}")
            
    def test_get_user_calls(self):
        """Test GET /api/calls/user/{user_id}"""
        if not self.test_user_id:
            self.log_test("Get User Calls", False, "No test user ID available")
            return
            
        try:
            response = self.make_request("GET", f"/calls/user/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get User Calls", True, f"Retrieved {len(data)} calls", data)
                else:
                    self.log_test("Get User Calls", False, f"Invalid response format: {data}")
            else:
                self.log_test("Get User Calls", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get User Calls", False, f"Exception: {str(e)}")
            
    def test_get_single_call(self):
        """Test GET /api/calls/{call_id}"""
        if not self.test_call_id:
            self.log_test("Get Single Call", False, "No test call ID available")
            return
            
        try:
            response = self.make_request("GET", f"/calls/{self.test_call_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.test_call_id:
                    self.log_test("Get Single Call", True, f"Retrieved call: {data.get('caller_number')}", data)
                else:
                    self.log_test("Get Single Call", False, f"Call ID mismatch: {data}")
            else:
                self.log_test("Get Single Call", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Single Call", False, f"Exception: {str(e)}")
            
    def test_analyze_call(self):
        """Test POST /api/calls/{call_id}/analyze"""
        if not self.test_call_id:
            self.log_test("Analyze Call", False, "No test call ID available")
            return
            
        try:
            response = self.make_request("POST", f"/calls/{self.test_call_id}/analyze")
            
            if response.status_code == 200:
                data = response.json()
                if "scam_score" in data and "analyzed" in data:
                    scam_score = data.get("scam_score", 0)
                    self.log_test("Analyze Call", True, f"Call analyzed, scam score: {scam_score}%", data)
                else:
                    self.log_test("Analyze Call", False, f"Missing analysis fields: {data}")
            else:
                self.log_test("Analyze Call", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Analyze Call", False, f"Exception: {str(e)}")
            
    def test_direct_analysis(self):
        """Test POST /api/analyze (form data)"""
        try:
            form_data = {
                "transcript": "Congratulations! You have won $10,000. To claim your prize, please send $500 processing fee immediately.",
                "language": "en"
            }
            
            response = self.make_request("POST", "/analyze", data=form_data)
            
            if response.status_code == 200:
                data = response.json()
                if "is_scam" in data and "confidence" in data:
                    is_scam = data.get("is_scam")
                    confidence = data.get("confidence")
                    self.log_test("Direct Analysis", True, f"Analysis complete - Scam: {is_scam}, Confidence: {confidence}%", data)
                else:
                    self.log_test("Direct Analysis", False, f"Missing analysis fields: {data}")
            else:
                self.log_test("Direct Analysis", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Direct Analysis", False, f"Exception: {str(e)}")
            
    def test_update_call_feedback(self):
        """Test PUT /api/calls/{call_id}/feedback"""
        if not self.test_call_id:
            self.log_test("Update Call Feedback", False, "No test call ID available")
            return
            
        try:
            response = self.make_request("PUT", f"/calls/{self.test_call_id}/feedback?feedback=scam")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Update Call Feedback", True, f"Feedback updated: {data.get('feedback')}", data)
                else:
                    self.log_test("Update Call Feedback", False, f"Unexpected response: {data}")
            else:
                self.log_test("Update Call Feedback", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Update Call Feedback", False, f"Exception: {str(e)}")
            
    def test_demo_scam_call(self):
        """Test POST /api/demo/scam-call"""
        if not self.test_user_id:
            self.log_test("Demo Scam Call", False, "No test user ID available")
            return
            
        try:
            response = self.make_request("POST", f"/demo/scam-call?user_id={self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("analyzed") == True:
                    scam_score = data.get("scam_score", 0)
                    self.log_test("Demo Scam Call", True, f"Demo scam call created, score: {scam_score}%", data)
                else:
                    self.log_test("Demo Scam Call", False, f"Invalid demo call response: {data}")
            else:
                self.log_test("Demo Scam Call", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Demo Scam Call", False, f"Exception: {str(e)}")
            
    def test_demo_legit_call(self):
        """Test POST /api/demo/legit-call"""
        if not self.test_user_id:
            self.log_test("Demo Legit Call", False, "No test user ID available")
            return
            
        try:
            response = self.make_request("POST", f"/demo/legit-call?user_id={self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("analyzed") == True:
                    scam_score = data.get("scam_score", 0)
                    self.log_test("Demo Legit Call", True, f"Demo legit call created, score: {scam_score}%", data)
                else:
                    self.log_test("Demo Legit Call", False, f"Invalid demo call response: {data}")
            else:
                self.log_test("Demo Legit Call", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Demo Legit Call", False, f"Exception: {str(e)}")
            
    def test_register_device(self):
        """Test POST /api/users/{user_id}/device"""
        if not self.test_user_id:
            self.log_test("Register Device", False, "No test user ID available")
            return
            
        try:
            device_data = {
                "device_id": "test-device-123",
                "fcm_token": "test-fcm-token-456",
                "platform": "android",
                "app_version": "1.0.0",
                "os_version": "Android 12"
            }
            
            response = self.make_request("POST", f"/users/{self.test_user_id}/device", json=device_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Register Device", True, "Device registered successfully", data)
                else:
                    self.log_test("Register Device", False, f"Unexpected response: {data}")
            else:
                self.log_test("Register Device", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Register Device", False, f"Exception: {str(e)}")
            
    def test_check_known_number(self):
        """Test GET /api/users/{user_id}/check-number/{phone}"""
        if not self.test_user_id:
            self.log_test("Check Known Number", False, "No test user ID available")
            return
            
        try:
            # Test with emergency contact number
            test_phone = "+37369987654"
            response = self.make_request("GET", f"/users/{self.test_user_id}/check-number/{test_phone}")
            
            if response.status_code == 200:
                data = response.json()
                if "is_known" in data and "should_record" in data:
                    is_known = data.get("is_known")
                    self.log_test("Check Known Number", True, f"Number check complete - Known: {is_known}", data)
                else:
                    self.log_test("Check Known Number", False, f"Missing response fields: {data}")
            else:
                self.log_test("Check Known Number", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Check Known Number", False, f"Exception: {str(e)}")
            
    def test_get_user_stats(self):
        """Test GET /api/stats/{user_id}"""
        if not self.test_user_id:
            self.log_test("Get User Stats", False, "No test user ID available")
            return
            
        try:
            response = self.make_request("GET", f"/stats/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "total_calls" in data and "scam_calls" in data:
                    total = data.get("total_calls", 0)
                    scam = data.get("scam_calls", 0)
                    self.log_test("Get User Stats", True, f"Stats retrieved - Total: {total}, Scam: {scam}", data)
                else:
                    self.log_test("Get User Stats", False, f"Missing stats fields: {data}")
            else:
                self.log_test("Get User Stats", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get User Stats", False, f"Exception: {str(e)}")
            
    def test_delete_user(self):
        """Test DELETE /api/users/{user_id}"""
        if not self.test_user_id:
            self.log_test("Delete User", False, "No test user ID available")
            return
            
        try:
            response = self.make_request("DELETE", f"/users/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    deleted_calls = data.get("deleted_calls", 0)
                    self.log_test("Delete User", True, f"User deleted, {deleted_calls} calls removed", data)
                else:
                    self.log_test("Delete User", False, f"Unexpected response: {data}")
            else:
                self.log_test("Delete User", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Delete User", False, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Run complete test suite"""
        print(f"\n🧪 Starting StopFrauda API Test Suite")
        print(f"🌐 Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Core API tests
        self.test_health_check()
        
        # User management workflow
        self.test_create_user()
        self.test_get_user()
        self.test_update_user()
        
        # Emergency contacts
        self.test_add_emergency_contacts()
        self.test_get_emergency_contacts()
        
        # Call records and analysis
        self.test_create_call_record()
        self.test_get_user_calls()
        self.test_get_single_call()
        self.test_analyze_call()
        self.test_direct_analysis()
        self.test_update_call_feedback()
        
        # Demo endpoints
        self.test_demo_scam_call()
        self.test_demo_legit_call()
        
        # Production endpoints
        self.test_register_device()
        self.test_check_known_number()
        self.test_get_user_stats()
        
        # Cleanup
        self.test_delete_user()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🚨 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['details']}")
                    
        return self.test_results

if __name__ == "__main__":
    tester = StopFraudaAPITester()
    results = tester.run_all_tests()