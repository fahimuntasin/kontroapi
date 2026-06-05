# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Active          |
| < 0.1   | ❌ End of life     |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Email us at **security@kontroapi.com** with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

We will:
- Acknowledge within 48 hours
- Provide a timeline for fix within 7 days
- Credit you in the fix release (unless you prefer anonymity)
- Notify you when the fix is shipped

## Scope

In scope:
- Authentication/authorization bypass
- Cross-tenant data exposure
- Remote code execution
- SQL injection, XSS, CSRF
- Webhook HMAC bypass
- Encryption key extraction

Out of scope:
- Issues in third-party packages (report upstream)
- Self-XSS requiring user to paste code
- DoS attacks requiring excessive resources
- Missing rate limits on signup (we have them)

## Hall of Fame

We credit security researchers who report valid issues.
