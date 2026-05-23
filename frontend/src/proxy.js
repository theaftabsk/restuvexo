import { NextResponse } from 'next/server';

export function proxy(request) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';

  // Determine if requesting the app subdomain
  // Production: app.restuvexo.shop
  // Development: app.localhost:3000 or app.localhost
  const isAppSubdomain = host.startsWith('app.restuvexo.shop') || host.startsWith('app.localhost');

  const { pathname } = url;

  // Let Next.js internals, API, static, and public files pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (isAppSubdomain) {
    // If accessing the root domain of the app subdomain, rewrite to /auth/login
    if (pathname === '/') {
      url.pathname = '/auth/login';
      return NextResponse.rewrite(url);
    }
    // Other routes pass through normally
    return NextResponse.next();
  } else {
    // If accessing the main landing domain, check if it's an application path
    const appPaths = ['/dashboard', '/auth', '/waiter', '/kds', '/customer', '/scan'];
    const isAppPath = appPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

    if (isAppPath) {
      // Redirect to the corresponding path on the app subdomain
      const isLocalhost = host.includes('localhost');
      const targetHost = isLocalhost ? 'app.localhost:3000' : 'app.restuvexo.shop';
      const protocol = isLocalhost ? 'http' : 'https';

      const newUrl = new URL(`${protocol}://${targetHost}${pathname}${url.search}`);
      return NextResponse.redirect(newUrl);
    }

    // Standard landing page requests pass through normally
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
