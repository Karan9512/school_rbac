import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routeAccessMap } from "./lib/settings";
import { NextResponse } from "next/server";

// Generate matchers based on routeAccessMap
const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccessMap[route],
}));

export default clerkMiddleware((auth, req) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // If role is missing, redirect to sign-in page, but avoid redirecting if already on it
  if (!role) {
    if (req.url.includes('/sign-in')) {
      return NextResponse.next(); // Prevent redirect if already on sign-in page
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Check each route and see if the role has access
  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req) && !allowedRoles.includes(role)) {
      // Redirect to "no access" page if the role doesn't have permission for the route
      console.log(`Redirecting to /no-access for role ${role} on ${req.url}`);
      return NextResponse.redirect(new URL("/no-access", req.url));
    }
  }

  // Allow the request to continue if everything checks out
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
