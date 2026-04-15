import requests
import sys
import json
from datetime import datetime

class FixMySiteAPITester:
    def __init__(self, base_url="https://web-audit-pro-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.session_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        resp_data = response.json()
                        print(f"   Response: {json.dumps(resp_data, indent=2)[:200]}...")
                    except:
                        print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")

            return success, response.json() if response.content and 'application/json' in response.headers.get('content-type', '') else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_email_subscribe(self):
        """Test email subscription endpoint"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "Email Subscribe",
            "POST",
            "email/subscribe",
            200,
            data={"email": test_email}
        )
        return success

    def test_auth_me_unauthenticated(self):
        """Test /auth/me returns 401 when not authenticated"""
        success, response = self.run_test(
            "Auth Me (Unauthenticated)",
            "GET",
            "auth/me",
            401
        )
        return success

    def test_analyses_history_unauthenticated(self):
        """Test /analyses/history returns 401 when not authenticated"""
        success, response = self.run_test(
            "Analyses History (Unauthenticated)",
            "GET",
            "analyses/history",
            401
        )
        return success

    def test_quick_scan(self):
        """Test quick-scan endpoint with https://google.com"""
        success, response = self.run_test(
            "Quick Scan (google.com)",
            "POST",
            "quick-scan",
            200,
            data={"url": "https://google.com"}
        )
        if success:
            # Verify response structure
            required_fields = ['scan_id', 'url', 'score', 'checks', 'response_time', 'is_https']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"❌ Missing fields in response: {missing_fields}")
                return False
            
            # Verify score is between 0-100
            if not (0 <= response['score'] <= 100):
                print(f"❌ Invalid score: {response['score']}")
                return False
                
            # Verify HTTPS detection
            if not response['is_https']:
                print(f"❌ HTTPS not detected for google.com")
                return False
                
            print(f"✅ Quick scan successful - Score: {response['score']}, HTTPS: {response['is_https']}, Response time: {response['response_time']}s")
            return True
        return success

    def test_analyze_with_openai_key(self):
        """Test analyze endpoint with OPENAI_API_KEY configured"""
        # Use longer timeout for AI analysis (takes 10-15 seconds)
        url = f"{self.api_url}/analyze"
        test_headers = {'Content-Type': 'application/json'}
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing Analyze (With OpenAI Key)...")
        print(f"   URL: {url}")
        print(f"   Note: This may take 10-15 seconds for AI analysis...")
        
        try:
            response = requests.post(url, json={"url": "https://google.com"}, headers=test_headers, timeout=30)
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                response_data = response.json()
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False
        if success:
            # Verify response structure
            required_fields = ['analysis_id', 'url', 'result']
            missing_fields = [field for field in required_fields if field not in response_data]
            if missing_fields:
                print(f"❌ Missing fields in response: {missing_fields}")
                return False
                
            result = response_data.get('result', {})
            result_fields = ['score', 'money_lost_monthly', 'summary', 'errors', 'opportunities']
            missing_result_fields = [field for field in result_fields if field not in result]
            if missing_result_fields:
                print(f"❌ Missing fields in result: {missing_result_fields}")
                return False
                
            print(f"✅ AI analysis successful - Score: {result['score']}, Money lost: {result['money_lost_monthly']}€/month")
            return True
        return success

    def test_stripe_checkout_creation(self):
        """Test Stripe checkout session creation"""
        success, response = self.run_test(
            "Stripe Checkout Creation",
            "POST",
            "payments/create-checkout",
            200,
            data={
                "origin_url": self.base_url,
                "analysis_id": "test_analysis_123"
            }
        )
        if success and 'url' in response and 'session_id' in response:
            print(f"✅ Checkout session created with URL and session_id")
            return True
        return success

    def test_health_endpoints(self):
        """Test basic health/connectivity"""
        # Test if backend is accessible
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            print(f"🔍 Backend connectivity test - Status: {response.status_code}")
            return True
        except Exception as e:
            print(f"❌ Backend connectivity failed: {str(e)}")
            return False

def main():
    print("🚀 Starting FixMySite AI Backend API Tests")
    print("=" * 50)
    
    tester = FixMySiteAPITester()
    
    # Test basic connectivity
    if not tester.test_health_endpoints():
        print("❌ Backend not accessible, stopping tests")
        return 1

    # Run API tests
    tests = [
        tester.test_email_subscribe,
        tester.test_auth_me_unauthenticated,
        tester.test_analyses_history_unauthenticated,
        tester.test_quick_scan,
        tester.test_analyze_with_openai_key,
        tester.test_stripe_checkout_creation,
    ]

    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())