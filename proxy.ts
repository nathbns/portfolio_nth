import { NextResponse } from "next/server";

// Unlisted pages: everything under /2A (pages, videos, files) is open but
// marked "noindex" so search engines do not list it.
export function proxy() {
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/2A", "/2A/:path*"],
};
