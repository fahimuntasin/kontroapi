import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_ROUTES = ['/', '/login', '/register'];
const API_ROUTES_NO_AUTH = [
  '/api/auth/otp-send',
  '/api/auth/otp-verify',
  '/api/auth/complete-signup',
  '/api/auth/callback',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/webhooks/naafipay',
];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-please-change-in-production-min-32-chars'
);

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('kontroapi_token')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((r) => pathname === r)) return response;
  if (API_ROUTES_NO_AUTH.some((r) => pathname.startsWith(r))) return response;

  const isDashboardPage = pathname.startsWith('/dashboard');
  const isProtectedApi = pathname.startsWith('/api/') && !API_ROUTES_NO_AUTH.some((r) => pathname.startsWith(r));

  if (isDashboardPage || isProtectedApi) {
    const authed = await isAuthenticated(request);
    if (!authed) {
      if (isDashboardPage) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
  }

  const authed = await isAuthenticated(request);
  if (authed && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
