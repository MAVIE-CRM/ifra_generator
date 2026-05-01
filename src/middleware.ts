import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;

  // 1. Pagine pubbliche (Solo Login e API di Auth)
  const isLoginPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isPublicAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico');

  if (isLoginPage || isAuthApi || isPublicAsset) {
    return NextResponse.next();
  }

  // 2. Controllo Autenticazione (Tutto il resto, inclusa la root '/', è protetto)
  if (!authToken || authToken.trim() === '') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
