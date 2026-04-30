import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;

  // 1. Pagine pubbliche (Aperte per Health Check e Landing)
  const isLoginPage = pathname === '/login';
  const isRootPage = pathname === '/';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isHealthCheck = pathname === '/api/health';
  const isPublicAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico');

  if (isLoginPage || isRootPage || isAuthApi || isHealthCheck || isPublicAsset) {
    return NextResponse.next();
  }

  // 2. Controllo Autenticazione (Tutto il resto è protetto)
  if (!authToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
