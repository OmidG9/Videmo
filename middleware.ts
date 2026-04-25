import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

export const middleware = withAuth(
  function middleware(req: NextRequest) {
    return null;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect /dashboard routes
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        return true;
      },
    },
  },
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
