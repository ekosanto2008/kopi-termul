import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // 1. URL MAPPING (Obscurity - Base64 Encoded)
  // admin -> YWRtaW4=
  // kitchen -> a2l0Y2hlbg==
  // pos -> cG9z
  const pathMap: Record<string, string> = {
    '/cG9z': '/pos',
    '/a2l0Y2hlbg==': '/kitchen',
    '/YWRtaW4=': '/admin',
  };

  // Cek apakah user mengakses URL Rahasia
  const destination = pathMap[pathname];
  if (destination) {
    // Rewrite normal (Auth akan ditangani oleh Page Guard masing-masing)
    return NextResponse.rewrite(new URL(destination, request.url));
  }

  // 2. BLOCK AKSES LANGSUNG KE URL ASLI
  // Jika user mencoba buka /admin, /kitchen, /pos secara langsung -> Redirect ke Home
  const protectedPaths = ['/admin', '/kitchen', '/pos'];
  
  // Pengecualian: Jangan block file statis atau API atau sub-path tertentu jika perlu
  // Kita cek apakah pathname dimulai dengan salah satu protected path
  const isProtected = protectedPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));

  if (isProtected) {
    // Redirect ke home (atau 404 custom page)
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match paths that we want to rewrite OR block
    '/cG9z', '/a2l0Y2hlbg==', '/YWRtaW4=',
    '/pos/:path*', '/kitchen/:path*', '/admin/:path*',
    // Exclude static files and APIs
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
