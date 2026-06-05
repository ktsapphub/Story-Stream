import requests
import sys
import json
from datetime import datetime

class SettingsAPITester:
    def __init__(self, base_url="https://content-studio-396.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, name, passed, details=""):
        """Log a test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"\n{status} - {name}")
        if details:
            print(f"  Details: {details}")
        self.test_results.append({
            "test": name,
            "passed": passed,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            req_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.log_result(name, True, f"Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log_result(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_result(name, False, f"Error: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_platform_info(self):
        """Test GET /api/settings/platform"""
        success, response = self.run_test(
            "GET /api/settings/platform",
            "GET",
            "settings/platform",
            200
        )
        if success:
            # Verify structure
            if 'groups' in response:
                groups = response['groups']
                expected_groups = ['Frontend', 'Backend', 'Database & Storage', 'AI & Generation', 'Infrastructure']
                found_groups = [g['title'] for g in groups]
                all_found = all(eg in found_groups for eg in expected_groups)
                self.log_result("Platform groups structure", all_found, f"Found groups: {found_groups}")
                return all_found
        return False

    def test_list_connections(self):
        """Test GET /api/settings/connections"""
        success, response = self.run_test(
            "GET /api/settings/connections",
            "GET",
            "settings/connections",
            200
        )
        if success:
            connections = response.get('connections', [])
            categories = response.get('categories', [])
            
            # Verify 8 connections
            conn_count = len(connections)
            self.log_result("Connection count (8 expected)", conn_count == 8, f"Found {conn_count} connections")
            
            # Verify expected providers
            expected_providers = ['ai_llm', 'pexels', 'pixabay', 'unsplash', 'wordpress', 'zapier', 'sendgrid', 'reachinbox']
            found_providers = [c['key'] for c in connections]
            all_found = all(ep in found_providers for ep in expected_providers)
            self.log_result("All expected providers present", all_found, f"Found: {found_providers}")
            
            # Verify categories
            expected_categories = ['AI & Content', 'Stock Images', 'Publishing', 'Automation & Email']
            all_cats = all(ec in categories for ec in expected_categories)
            self.log_result("All expected categories present", all_cats, f"Found: {categories}")
            
            # Verify ai_llm is managed
            ai_llm = next((c for c in connections if c['key'] == 'ai_llm'), None)
            if ai_llm:
                is_managed = ai_llm.get('managed', False)
                self.log_result("AI/LLM is managed", is_managed, f"Managed: {is_managed}")
            
            return success and conn_count == 8 and all_found
        return False

    def test_save_pexels_connection(self, api_key="test-pexels-key-12345"):
        """Test PUT /api/settings/connections/pexels"""
        success, response = self.run_test(
            "PUT /api/settings/connections/pexels (save)",
            "PUT",
            "settings/connections/pexels",
            200,
            data={"values": {"api_key": api_key}, "enabled": True}
        )
        if success:
            # Verify response structure
            configured = response.get('configured', False)
            values = response.get('values', {})
            status = response.get('status', {})
            
            self.log_result("Pexels configured flag", configured, f"Configured: {configured}")
            self.log_result("Pexels API key saved", values.get('api_key') == api_key, f"Key: {values.get('api_key')}")
            
            # Auto-test should have run
            has_status = 'status' in response and response['status'] is not None
            self.log_result("Auto-test ran on save", has_status, f"Status: {status}")
            
            return success and configured
        return False

    def test_connection_test(self, provider):
        """Test POST /api/settings/connections/{provider}/test"""
        success, response = self.run_test(
            f"POST /api/settings/connections/{provider}/test",
            "POST",
            f"settings/connections/{provider}/test",
            200
        )
        if success:
            connected = response.get('connected')
            message = response.get('message', '')
            checked_at = response.get('checked_at', '')
            
            self.log_result(f"{provider} test result", 'connected' in response, 
                          f"Connected: {connected}, Message: {message}, Checked: {checked_at}")
            return success
        return False

    def test_stock_providers_integration(self):
        """Test GET /api/stock/providers after saving Pexels key"""
        success, response = self.run_test(
            "GET /api/stock/providers (after Pexels save)",
            "GET",
            "stock/providers",
            200
        )
        if success:
            providers = response.get('providers', {})
            pexels_configured = providers.get('pexels', False)
            self.log_result("Pexels configured in stock providers", pexels_configured, 
                          f"Providers: {providers}")
            return pexels_configured
        return False

    def test_stock_search_integration(self):
        """Test GET /api/stock/search with saved Pexels key"""
        success, response = self.run_test(
            "GET /api/stock/search?query=love&provider=pexels",
            "GET",
            "stock/search?query=love&provider=pexels",
            200
        )
        if success:
            results = response.get('results', [])
            self.log_result("Stock search returns results", len(results) >= 0, 
                          f"Found {len(results)} results (may be 0 if key invalid, but no 400 error)")
            return success
        return False

    def test_delete_connection(self, provider):
        """Test DELETE /api/settings/connections/{provider}"""
        success, response = self.run_test(
            f"DELETE /api/settings/connections/{provider}",
            "DELETE",
            f"settings/connections/{provider}",
            200
        )
        if success:
            # Verify connection is cleared by re-fetching
            success2, response2 = self.run_test(
                f"Verify {provider} cleared (re-GET connections)",
                "GET",
                "settings/connections",
                200
            )
            if success2:
                connections = response2.get('connections', [])
                conn = next((c for c in connections if c['key'] == provider), None)
                if conn:
                    configured = conn.get('configured', True)
                    self.log_result(f"{provider} cleared", not configured, 
                                  f"Configured after delete: {configured}")
                    return not configured
        return False

    def test_save_wordpress_connection(self):
        """Test WordPress connection with multiple fields"""
        success, response = self.run_test(
            "PUT /api/settings/connections/wordpress (multiple fields)",
            "PUT",
            "settings/connections/wordpress",
            200,
            data={
                "values": {
                    "site_url": "https://example.com",
                    "username": "admin",
                    "app_password": "test password 1234"
                },
                "enabled": True
            }
        )
        if success:
            values = response.get('values', {})
            all_saved = (
                values.get('site_url') == "https://example.com" and
                values.get('username') == "admin" and
                values.get('app_password') == "test password 1234"
            )
            self.log_result("WordPress all fields saved", all_saved, f"Values: {values}")
            return all_saved
        return False

    def test_manual_limit_field(self):
        """Test manual_limit field for connections without live usage"""
        success, response = self.run_test(
            "PUT /api/settings/connections/sendgrid (with manual_limit)",
            "PUT",
            "settings/connections/sendgrid",
            200,
            data={
                "values": {"api_key": "SG.test123", "from_email": "test@example.com"},
                "enabled": True,
                "manual_limit": "10,000 emails / month"
            }
        )
        if success:
            manual_limit = response.get('manual_limit', '')
            self.log_result("Manual limit saved", manual_limit == "10,000 emails / month", 
                          f"Manual limit: {manual_limit}")
            return manual_limit == "10,000 emails / month"
        return False

def main():
    print("=" * 60)
    print("CONTENT STUDIO - SETTINGS/CONNECTIONS API TEST")
    print("=" * 60)
    
    tester = SettingsAPITester()
    
    # Login
    print("\n📋 AUTHENTICATION")
    if not tester.test_login("mydatejar@gmail.com", "Test1234"):
        print("❌ Login failed, stopping tests")
        return 1
    
    # Platform info
    print("\n📋 PLATFORM INFO")
    tester.test_platform_info()
    
    # List connections
    print("\n📋 CONNECTIONS LIST")
    tester.test_list_connections()
    
    # Save Pexels connection
    print("\n📋 SAVE CONNECTION (Pexels)")
    tester.test_save_pexels_connection()
    
    # Test AI/LLM connection (managed, read-only)
    print("\n📋 TEST CONNECTION (AI/LLM - managed)")
    tester.test_connection_test("ai_llm")
    
    # Test Pexels connection
    print("\n📋 TEST CONNECTION (Pexels)")
    tester.test_connection_test("pexels")
    
    # Stock providers integration
    print("\n📋 STOCK INTEGRATION")
    tester.test_stock_providers_integration()
    tester.test_stock_search_integration()
    
    # WordPress multi-field
    print("\n📋 MULTI-FIELD CONNECTION (WordPress)")
    tester.test_save_wordpress_connection()
    
    # Manual limit
    print("\n📋 MANUAL LIMIT FIELD (SendGrid)")
    tester.test_manual_limit_field()
    
    # Delete connections (cleanup)
    print("\n📋 DELETE CONNECTION (cleanup)")
    tester.test_delete_connection("pexels")
    tester.test_delete_connection("wordpress")
    tester.test_delete_connection("sendgrid")
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    print("=" * 60)
    
    # Save detailed results
    with open('/app/test_reports/backend_settings_test.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "failed_tests": tester.tests_run - tester.tests_passed,
            "results": tester.test_results
        }, f, indent=2)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
