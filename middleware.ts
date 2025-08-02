import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect editor routes
        if (req.nextUrl.pathname.startsWith('/editor')) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/editor/:path*']
};