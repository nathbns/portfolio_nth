import { NextResponse, type NextRequest } from "next/server";

// Private pages: everything under /2A (pages, videos, files) asks for a
// password, read from the REVISION_PASSWORD environment variable (set in the
// Vercel project settings). Without that variable, the pages stay closed.
export function proxy(request: NextRequest) {
  const password = process.env.REVISION_PASSWORD;
  const header = request.headers.get("authorization");
  if (password && header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (given === password) {
        const response = NextResponse.next();
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
        return response;
      }
    } catch {
      // malformed header: fall through to the 401
    }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="private", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const config = {
  matcher: ["/2A", "/2A/:path*"],
};
