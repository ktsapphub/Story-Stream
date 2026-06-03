# Auth Testing Guide — Content Studio

Auth is JWT bearer-token based (NOT cookies). Token in `Authorization: Bearer <token>` header.

## Credentials
- Seed admin: `mydatejar@gmail.com` / `Test1234`
- Test bypass token: `cs-test-bypass` (works while ENABLE_TEST_BYPASS=true)

## API checks
```
# Login
curl -s -X POST http://localhost:8001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"mydatejar@gmail.com","password":"Test1234"}'
# -> { token, user }

# Authenticated call
curl -s http://localhost:8001/api/auth/me -H 'Authorization: Bearer <token>'

# Protected route without token returns 401
curl -s -o /dev/null -w '%{http_code}' http://localhost:8001/api/stats   # 401
```

## Frontend
- Unauthenticated users are redirected to `/login`.
- Login form testids: `auth-login-email-input`, `auth-login-password-input`, `auth-login-submit-button`.
- Signup form testids: `auth-signup-email-input`, `auth-signup-password-input`, `auth-signup-confirm-password-input`, `auth-signup-submit-button`.
- After login, token saved to localStorage `cs_token`; all API calls send it via axios interceptor.
- Logout button in sidebar clears token and returns to /login.

## Notes
- All data is user-scoped by `owner`. Two different users do not see each other's content.
- `/api/files/{path}` is public for image rendering.
