import { NextResponse } from 'next/server';

export function proxy(request) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';

  // Determine subdomain type
  // Production:  app.restuvexo.shop  |  admin.restuvexo.shop
  // Development: app.localhost:3000   |  admin.localhost:3000
  const isAppSubdomain   = host.startsWith('app.restuvexo.shop')   || host.startsWith('app.localhost');
  const isAdminSubdomain = host.startsWith('admin.restuvexo.shop')  || host.startsWith('admin.localhost');

  const { pathname } = url;

  // Let Next.js internals, API, static, and public files pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ─── ADMIN SUBDOMAIN ──────────────────────────────────────────
  // admin.restuvexo.shop/       → /super-admin (login)
  // admin.restuvexo.shop/dash   → /super-admin/dashboard
  // admin.restuvexo.shop/restaurants → /super-admin/restaurants
  // etc.
  if (isAdminSubdomain) {
    // Already on a /super-admin path — pass through
    if (pathname.startsWith('/super-admin')) {
      return NextResponse.next();
    }

    // Root → super-admin login
    if (pathname === '/') {
      url.pathname = '/super-admin';
      return NextResponse.rewrite(url);
    }

    // Any other path on admin subdomain → rewrite under /super-admin
    // e.g.  /dashboard → /super-admin/dashboard
    url.pathname = '/super-admin' + pathname;
    return NextResponse.rewrite(url);
  }

  // ─── APP SUBDOMAIN ────────────────────────────────────────────
  if (isAppSubdomain) {
    // Root of app subdomain → login
    if (pathname === '/') {
      url.pathname = '/auth/login';
      return NextResponse.rewrite(url);
    }
    // Block admin paths from the app subdomain — redirect to admin domain
    if (pathname.startsWith('/super-admin')) {
      const isLocalhost = host.includes('localhost');
      const adminHost   = isLocalhost ? 'admin.localhost:3000' : 'admin.restuvexo.shop';
      const protocol    = isLocalhost ? 'http' : 'https';
      return NextResponse.redirect(new URL(`${protocol}://${adminHost}/`));
    }
    return NextResponse.next();
  }

  // ─── MAIN / LANDING DOMAIN ───────────────────────────────────
  const appPaths = ['/dashboard', '/auth', '/waiter', '/kds', '/customer', '/scan'];
  const isAppPath = appPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

  if (isAppPath) {
    const isLocalhost = host.includes('localhost');
    const targetHost  = isLocalhost ? 'app.localhost:3000' : 'app.restuvexo.shop';
    const protocol    = isLocalhost ? 'http' : 'https';
    return NextResponse.redirect(new URL(`${protocol}://${targetHost}${pathname}${url.search}`));
  }

  // Standard landing page — pass through
  return NextResponse.next();
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

