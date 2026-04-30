import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;

  // 1. Pagine pubbliche
  const isLoginPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isHealthCheck = pathname === '/api/health';
  const isPublicAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico');

  if (isLoginPage || isAuthApi || isHealthCheck || isPublicAsset) {
    return NextResponse.next();
  }

  // 2. Controllo Autenticazione
  // In produzione, potresti voler verificare che authToken sia uguale a process.env.APP_PASSWORD
  // ma il middleware edge non ha sempre accesso a process.env se non configurato.
  // Qui controlliamo solo l'esistenza del cookie impostato dalla nostra API.
  if (!authToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) -> proteggiamo anche queste tranne /api/auth
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
