"""
Comprehensive backend API tests for Content Studio Phase 3.
Tests auth (JWT bearer tokens), user scoping, and all endpoints with authentication.
"""
import requests
import sys
import time
import json
from datetime import datetime

# Use the public endpoint from frontend/.env
BASE_URL = "https://content-studio-396.preview.emergentagent.com/api"

class ContentStudioTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.content_ids = []
        self.media_ids = []
        self.knowledge_ids = []
        self.job_ids = []
        self.token = None  # JWT bearer token
        self.user = None
        
    def log(self, msg, level="INFO"):
        """Log with timestamp"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {level}: {msg}")
    
    def test(self, name, method, endpoint, expected_status, data=None, params=None, 
             files=None, timeout=60, check_response=None, use_auth=True):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        self.tests_run += 1
        self.log(f"Test #{self.tests_run}: {name}")
        
        try:
            headers = {}
            if not files:
                headers['Content-Type'] = 'application/json'
            
            # Add auth header if token is available and use_auth is True
            if use_auth and self.token:
                headers['Authorization'] = f'Bearer {self.token}'
            
            if method == 'GET':
                response = requests.get(url, params=params, headers=headers, timeout=timeout)
            elif method == 'POST':
                if files:
                    # For file uploads, don't set Content-Type (requests will set it with boundary)
                    auth_headers = {}
                    if use_auth and self.token:
                        auth_headers['Authorization'] = f'Bearer {self.token}'
                    response = requests.post(url, files=files, data=data, headers=auth_headers, timeout=timeout)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    resp_data = response.json() if response.content else {}
                except:
                    resp_data = {}
                
                # Additional response checks
                if check_response and resp_data:
                    check_result = check_response(resp_data)
                    if not check_result:
                        success = False
                        self.log(f"  ❌ FAILED - Response validation failed", "ERROR")
                
                if success:
                    self.tests_passed += 1
                    self.log(f"  ✅ PASSED - Status: {response.status_code}")
                    return True, resp_data
                else:
                    self.tests_failed += 1
                    return False, resp_data
            else:
                self.tests_failed += 1
                self.log(f"  ❌ FAILED - Expected {expected_status}, got {response.status_code}", "ERROR")
                try:
                    self.log(f"  Response: {response.text[:200]}", "ERROR")
                except:
                    pass
                return False, {}
                
        except requests.exceptions.Timeout:
            self.tests_failed += 1
            self.log(f"  ❌ FAILED - Request timeout after {timeout}s", "ERROR")
            return False, {}
        except Exception as e:
            self.tests_failed += 1
            self.log(f"  ❌ FAILED - Error: {str(e)}", "ERROR")
            return False, {}
    
    def run_all_tests(self):
        """Run all test suites"""
        self.log("=" * 60)
        self.log("Starting Content Studio Phase 3 Backend Tests")
        self.log("=" * 60)
        
        # Test 1: Auth endpoints
        self.log("\n### Testing Auth Endpoints ###")
        self.test_auth_endpoints()
        
        # Test 2: Protected endpoints without auth (should return 401)
        self.log("\n### Testing Protected Endpoints Without Auth ###")
        self.test_protected_without_auth()
        
        # Test 3: User scoping
        self.log("\n### Testing User Scoping ###")
        self.test_user_scoping()
        
        # Test 4: Meta endpoints (with auth)
        self.log("\n### Testing Meta Endpoints (Authenticated) ###")
        self.test_meta_endpoints()
        
        # Test 5: Blog generation (single)
        self.log("\n### Testing Blog Generation ###")
        self.test_blog_generation()
        
        # Test 6: Batch generation
        self.log("\n### Testing Batch Generation ###")
        self.test_batch_generation()
        
        # Test 7: Quality scoring
        self.log("\n### Testing Quality Scoring ###")
        self.test_scoring()
        
        # Test 8: Newsletter generation
        self.log("\n### Testing Newsletter Generation ###")
        self.test_newsletter_generation()
        
        # Test 9: Image generation
        self.log("\n### Testing Image Generation ###")
        self.test_image_generation()
        
        # Test 10: Media management
        self.log("\n### Testing Media Management ###")
        self.test_media_management()
        
        # Test 11: Knowledge base
        self.log("\n### Testing Knowledge Base ###")
        self.test_knowledge_base()
        
        # Test 12: Content CRUD
        self.log("\n### Testing Content CRUD ###")
        self.test_content_crud()
        
        # Test 13: Exports
        self.log("\n### Testing Exports ###")
        self.test_exports()
        
        # Print summary
        self.print_summary()
        
        return self.tests_failed == 0
    
    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        # Test login with correct credentials
        payload = {
            "email": "mydatejar@gmail.com",
            "password": "Test1234"
        }
        
        success, data = self.test(
            "POST /api/auth/login (correct credentials)",
            "POST", "auth/login", 200,
            data=payload,
            use_auth=False,
            check_response=lambda d: "token" in d and "user" in d
        )
        
        if success and data.get("token"):
            self.token = data["token"]
            self.user = data["user"]
            self.log(f"  Logged in as: {self.user.get('email')}")
        else:
            self.log("  ❌ CRITICAL: Failed to login, cannot continue tests", "ERROR")
            return
        
        # Test login with wrong password
        payload = {
            "email": "mydatejar@gmail.com",
            "password": "WrongPassword123"
        }
        
        self.test(
            "POST /api/auth/login (wrong password) - should return 401",
            "POST", "auth/login", 401,
            data=payload,
            use_auth=False
        )
        
        # Test GET /api/auth/me with valid token
        self.test(
            "GET /api/auth/me (with valid token)",
            "GET", "auth/me", 200,
            check_response=lambda d: "email" in d and d.get("email") == "mydatejar@gmail.com"
        )
        
        # Test register new user
        timestamp = int(time.time())
        new_email = f"tester+{timestamp}@example.com"
        payload = {
            "email": new_email,
            "password": "Test1234",
            "name": "Test User"
        }
        
        success, data = self.test(
            f"POST /api/auth/register (new user: {new_email})",
            "POST", "auth/register", 200,
            data=payload,
            use_auth=False,
            check_response=lambda d: "token" in d and "user" in d and d["user"].get("email") == new_email
        )
        
        if success:
            self.log(f"  New user registered: {new_email}")
        
        # Test bypass token (if enabled)
        self.log("\n  Testing bypass token...")
        bypass_token = "cs-test-bypass"
        original_token = self.token
        self.token = bypass_token
        
        success, data = self.test(
            "GET /api/auth/me (with bypass token)",
            "GET", "auth/me", 200,
            check_response=lambda d: "email" in d
        )
        
        if success:
            self.log(f"  ✅ Bypass token works, authenticated as: {data.get('email')}")
        
        # Restore original token
        self.token = original_token
    
    def test_protected_without_auth(self):
        """Test that protected endpoints return 401 without auth"""
        # Save current token
        original_token = self.token
        self.token = None
        
        # Test various protected endpoints
        endpoints = [
            ("GET /api/stats", "GET", "stats"),
            ("GET /api/content", "GET", "content"),
            ("GET /api/models", "GET", "models"),
            ("GET /api/media", "GET", "media"),
            ("GET /api/knowledge", "GET", "knowledge"),
        ]
        
        for name, method, endpoint in endpoints:
            self.test(
                f"{name} (no auth) - should return 401",
                method, endpoint, 401,
                use_auth=False
            )
        
        # Restore token
        self.token = original_token
    
    def test_user_scoping(self):
        """Test that users only see their own data"""
        # Save seed user token
        seed_token = self.token
        
        # Register a brand new user
        timestamp = int(time.time())
        new_email = f"scoping_test+{timestamp}@example.com"
        payload = {
            "email": new_email,
            "password": "Test1234",
            "name": "Scoping Test User"
        }
        
        success, data = self.test(
            f"POST /api/auth/register (scoping test user: {new_email})",
            "POST", "auth/register", 200,
            data=payload,
            use_auth=False,
            check_response=lambda d: "token" in d
        )
        
        if not success or not data.get("token"):
            self.log("  ⚠️ Failed to create test user for scoping test", "WARN")
            self.token = seed_token
            return
        
        # Switch to new user's token
        new_user_token = data["token"]
        self.token = new_user_token
        self.log(f"  Switched to new user: {new_email}")
        
        # Test that new user sees empty content
        success, data = self.test(
            "GET /api/content (new user) - should be empty",
            "GET", "content", 200,
            check_response=lambda d: isinstance(d, list) and len(d) == 0
        )
        
        if success:
            self.log(f"  ✅ New user sees empty content (count: {len(data)})")
        
        # Test that new user sees empty stats
        success, data = self.test(
            "GET /api/stats (new user) - should be zero",
            "GET", "stats", 200,
            check_response=lambda d: d.get("blogs", -1) == 0 and d.get("newsletters", -1) == 0
        )
        
        if success:
            self.log(f"  ✅ New user sees zero stats: {data}")
        
        # Switch back to seed user
        self.token = seed_token
        self.log(f"  Switched back to seed user: mydatejar@gmail.com")
        
        # Test that seed user sees existing content
        success, data = self.test(
            "GET /api/content (seed user) - should have content",
            "GET", "content", 200,
            check_response=lambda d: isinstance(d, list) and len(d) > 0
        )
        
        if success:
            self.log(f"  ✅ Seed user sees existing content (count: {len(data)})")
    
    def test_meta_endpoints(self):
        """Test /models and /stats endpoints"""
        # Test GET /models
        success, data = self.test(
            "GET /api/models",
            "GET", "models", 200,
            check_response=lambda d: "models" in d and "default" in d and len(d["models"]) > 0
        )
        
        # Test GET /stats
        success, data = self.test(
            "GET /api/stats",
            "GET", "stats", 200,
            check_response=lambda d: all(k in d for k in ["blogs", "newsletters", "published", "media", "sources"])
        )
    
    def test_blog_generation(self):
        """Test single blog generation"""
        # Use gemini-2.5-flash for speed as recommended
        payload = {
            "topic": "Creative date ideas for couples in winter",
            "model_key": "gemini-2.5-flash",
            "tone": "warm and engaging",
            "length": "short",
            "save": True
        }
        
        success, data = self.test(
            "POST /api/generate/blog (gemini-2.5-flash, short)",
            "POST", "generate/blog", 200,
            data=payload,
            timeout=60,  # AI generation takes time
            check_response=lambda d: all(k in d for k in ["id", "title", "body_markdown", "tags", "meta_description"])
        )
        
        if success and data.get("id"):
            self.content_ids.append(data["id"])
            self.log(f"  Generated blog ID: {data['id']}, Title: {data.get('title', 'N/A')[:50]}")
    
    def test_batch_generation(self):
        """Test batch blog generation"""
        payload = {
            "topics": [
                "Romantic dinner ideas at home",
                "Fun outdoor activities for couples"
            ],
            "model_key": "gemini-2.5-flash",
            "tone": "warm and engaging",
            "length": "short"
        }
        
        success, data = self.test(
            "POST /api/generate/blog/batch",
            "POST", "generate/blog/batch", 200,
            data=payload,
            check_response=lambda d: "id" in d and "status" in d and "items" in d
        )
        
        if success and data.get("id"):
            job_id = data["id"]
            self.job_ids.append(job_id)
            self.log(f"  Batch job created: {job_id}")
            
            # Poll job status
            self.log("  Polling job status...")
            max_polls = 40  # 40 * 3s = 120s max wait
            for i in range(max_polls):
                time.sleep(3)
                success, job_data = self.test(
                    f"GET /api/jobs/{job_id} (poll {i+1})",
                    "GET", f"jobs/{job_id}", 200
                )
                
                if success:
                    status = job_data.get("status")
                    completed = job_data.get("completed", 0)
                    total = job_data.get("total", 0)
                    self.log(f"    Job status: {status}, completed: {completed}/{total}")
                    
                    if status == "done":
                        # Collect content IDs
                        for item in job_data.get("items", []):
                            if item.get("content_id"):
                                self.content_ids.append(item["content_id"])
                        self.log(f"  ✅ Batch job completed successfully")
                        break
                else:
                    self.log(f"  ⚠️ Failed to poll job status", "WARN")
                    break
            else:
                self.log(f"  ⚠️ Job did not complete within timeout", "WARN")
    
    def test_scoring(self):
        """Test quality scoring"""
        if not self.content_ids:
            self.log("  ⚠️ Skipping scoring test - no content available", "WARN")
            return
        
        content_id = self.content_ids[0]
        payload = {"content_id": content_id, "model_key": "gemini-2.5-flash"}
        
        success, data = self.test(
            f"POST /api/score (content_id: {content_id})",
            "POST", "score", 200,
            data=payload,
            timeout=45,
            check_response=lambda d: "overall_score" in d and "breakdown" in d and "suggestions" in d
        )
        
        if success:
            self.log(f"  Score: {data.get('overall_score', 0)}/100")
    
    def test_newsletter_generation(self):
        """Test newsletter generation from blog and from prompt"""
        # Test newsletter from blog
        if self.content_ids:
            blog_id = self.content_ids[0]
            payload = {
                "blog_content_id": blog_id,
                "model_key": "gemini-2.5-flash",
                "save": True
            }
            
            success, data = self.test(
                f"POST /api/generate/newsletter/from-blog",
                "POST", "generate/newsletter/from-blog", 200,
                data=payload,
                timeout=45,
                check_response=lambda d: "id" in d and "newsletter" in d and "sections" in d.get("newsletter", {})
            )
            
            if success and data.get("id"):
                self.content_ids.append(data["id"])
                self.log(f"  Newsletter from blog ID: {data['id']}")
        
        # Test newsletter from prompt
        payload = {
            "topic": "Weekly date ideas newsletter",
            "model_key": "gemini-2.5-flash",
            "tone": "warm and engaging",
            "save": True
        }
        
        success, data = self.test(
            "POST /api/generate/newsletter (from prompt)",
            "POST", "generate/newsletter", 200,
            data=payload,
            timeout=45,
            check_response=lambda d: "id" in d and "newsletter" in d
        )
        
        if success and data.get("id"):
            self.content_ids.append(data["id"])
            self.log(f"  Newsletter from prompt ID: {data['id']}")
    
    def test_image_generation(self):
        """Test AI image generation"""
        payload = {
            "prompt": "A romantic couple enjoying a cozy winter date with hot chocolate"
        }
        
        success, data = self.test(
            "POST /api/generate/image",
            "POST", "generate/image", 200,
            data=payload,
            timeout=30,
            check_response=lambda d: "id" in d and "url" in d and "storage_path" in d
        )
        
        if success and data.get("id"):
            self.media_ids.append(data["id"])
            self.log(f"  Generated image ID: {data['id']}")
            
            # Test serving the image (public endpoint, no auth needed)
            if data.get("storage_path"):
                path = data["storage_path"]
                # Save token and test without auth
                temp_token = self.token
                self.token = None
                success, _ = self.test(
                    f"GET /api/files/{path} (public, no auth)",
                    "GET", f"files/{path}", 200,
                    timeout=15,
                    use_auth=False
                )
                self.token = temp_token
    
    def test_media_management(self):
        """Test media upload, from-url, list, delete"""
        # Test media from URL (YouTube)
        payload = {
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "title": "Test video"
        }
        
        success, data = self.test(
            "POST /api/media/from-url (YouTube)",
            "POST", "media/from-url", 200,
            data=payload,
            check_response=lambda d: "id" in d and "media_type" in d
        )
        
        if success and data.get("id"):
            self.media_ids.append(data["id"])
        
        # Test media from URL (image)
        payload = {
            "url": "https://picsum.photos/800/600",
            "title": "Test image"
        }
        
        success, data = self.test(
            "POST /api/media/from-url (image URL)",
            "POST", "media/from-url", 200,
            data=payload,
            check_response=lambda d: "id" in d
        )
        
        if success and data.get("id"):
            self.media_ids.append(data["id"])
        
        # Test list media
        success, data = self.test(
            "GET /api/media",
            "GET", "media", 200,
            check_response=lambda d: isinstance(d, list)
        )
        
        # Test media upload (create a small test file)
        test_content = b"Test file content for Content Studio"
        files = {'file': ('test.txt', test_content, 'text/plain')}
        data_form = {'title': 'Test upload'}
        
        success, data = self.test(
            "POST /api/media/upload",
            "POST", "media/upload", 200,
            files=files,
            data=data_form,
            check_response=lambda d: "id" in d
        )
        
        if success and data.get("id"):
            self.media_ids.append(data["id"])
    
    def test_knowledge_base(self):
        """Test knowledge base URL add, list, get, delete"""
        # Test add URL (use a simple URL that's likely to work)
        payload = {
            "url": "https://example.com"
        }
        
        success, data = self.test(
            "POST /api/knowledge/url",
            "POST", "knowledge/url", 200,
            data=payload,
            timeout=45,
            check_response=lambda d: "id" in d and "summary" in d and "topics" in d
        )
        
        if success and data.get("id"):
            source_id = data["id"]
            self.knowledge_ids.append(source_id)
            self.log(f"  Knowledge source ID: {source_id}")
            self.log(f"  Summary: {data.get('summary', '')[:80]}...")
            
            # Test get knowledge
            success, data = self.test(
                f"GET /api/knowledge/{source_id}",
                "GET", f"knowledge/{source_id}", 200,
                check_response=lambda d: "id" in d and "content" in d
            )
        
        # Test list knowledge
        success, data = self.test(
            "GET /api/knowledge",
            "GET", "knowledge", 200,
            check_response=lambda d: isinstance(d, list)
        )
        
        # Test delete knowledge
        if self.knowledge_ids:
            kid = self.knowledge_ids[0]
            success, data = self.test(
                f"DELETE /api/knowledge/{kid}",
                "DELETE", f"knowledge/{kid}", 200
            )
    
    def test_content_crud(self):
        """Test content CRUD operations"""
        # Test list content
        success, data = self.test(
            "GET /api/content",
            "GET", "content", 200,
            check_response=lambda d: isinstance(d, list)
        )
        
        # Test list with filters
        success, data = self.test(
            "GET /api/content?type=blog",
            "GET", "content", 200,
            params={"type": "blog"},
            check_response=lambda d: isinstance(d, list)
        )
        
        # Test get content
        if self.content_ids:
            cid = self.content_ids[0]
            success, data = self.test(
                f"GET /api/content/{cid}",
                "GET", f"content/{cid}", 200,
                check_response=lambda d: d.get("id") == cid
            )
        
        # Test create new content
        payload = {
            "type": "blog",
            "title": "Test Blog Post",
            "body_markdown": "# Test\n\nThis is a test blog post.",
            "tags": ["test", "demo"],
            "status": "draft"
        }
        
        success, data = self.test(
            "POST /api/content (create)",
            "POST", "content", 200,
            data=payload,
            check_response=lambda d: "id" in d and d.get("title") == "Test Blog Post"
        )
        
        if success and data.get("id"):
            new_id = data["id"]
            self.content_ids.append(new_id)
            
            # Test update content
            update_payload = {
                **payload,
                "title": "Updated Test Blog Post"
            }
            
            success, data = self.test(
                f"PUT /api/content/{new_id}",
                "PUT", f"content/{new_id}", 200,
                data=update_payload,
                check_response=lambda d: d.get("title") == "Updated Test Blog Post"
            )
            
            # Test status change
            success, data = self.test(
                f"POST /api/content/{new_id}/status?status=published",
                "POST", f"content/{new_id}/status", 200,
                params={"status": "published"}
            )
            
            # Test delete
            success, data = self.test(
                f"DELETE /api/content/{new_id}",
                "DELETE", f"content/{new_id}", 200
            )
    
    def test_exports(self):
        """Test all export formats (with auth)"""
        if not self.content_ids:
            self.log("  ⚠️ Skipping export tests - no content available", "WARN")
            return
        
        content_id = self.content_ids[0]
        formats = [
            ("html", "text/html"),
            ("markdown", "text/markdown"),
            ("wordpress", "text/html"),
            ("csv", "text/csv"),
            ("pdf", "application/pdf"),
            ("txt", "text/plain")
        ]
        
        for fmt, expected_ct in formats:
            success, _ = self.test(
                f"GET /api/export/{content_id}?format={fmt}",
                "GET", f"export/{content_id}", 200,
                params={"format": fmt},
                timeout=20
            )
            
            if success:
                self.log(f"  ✅ Export format '{fmt}' working")
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Total tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed} ✅")
        self.log(f"Tests failed: {self.tests_failed} ❌")
        
        if self.tests_failed == 0:
            self.log("\n🎉 ALL TESTS PASSED! 🎉", "SUCCESS")
        else:
            success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
            self.log(f"\n⚠️ Success rate: {success_rate:.1f}%", "WARN")
        
        self.log("=" * 60)


def main():
    tester = ContentStudioTester()
    success = tester.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
