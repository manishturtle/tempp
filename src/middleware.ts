// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'
 
// export function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl
//   const pathParts = pathname.split('/').filter(Boolean)

//   // Only process if we have a tenant segment
//   if (pathParts.length >= 1) {
//     const tenant = pathParts[0]
    
//     // Check if the tenant is not in the expected case (e.g., contains uppercase)
//     if (tenant !== tenant.toLowerCase()) {
//       // Create a new URL with the lowercase tenant
//       const newUrl = new URL(request.url)
//       newUrl.pathname = newUrl.pathname.replace(
//         `/${pathParts[0]}/`,
//         `/${tenant}/`
//       )
      
//       // Redirect to the lowercase version
//       return NextResponse.redirect(newUrl)
//     }
//   }
  
//   return NextResponse.next()
// }

// export const config = {
//   // Define paths that should be processed by the middleware
//   matcher: [
//     '/((?!api|_next/static|_next/image|favicon.ico).*)',
//     // Only match paths with a tenant segment
//     '/:tenant*'
//   ],
// }


// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// const TENANT_RESOLUTION_API = process.env.NEXT_PUBLIC_TENANT_RESOLUTION_API || 'http://localhost:8001/api';
// const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico'];

// // Helper function to extract subdomain and domain
// function extractSubdomain(host: string | null) {
//   if (!host) return { subdomain: null, domain: null };

//   // Handle localhost with port
//   if (host.includes('localhost')) {
//     const parts = host.split('.');
//     if (parts.length > 1 && parts[0] !== 'www') {
//       return {
//         subdomain: parts[0],
//         domain: parts.slice(1).join('.')
//       };
//     }
//     return { subdomain: null, domain: host };
//   }

//   // Handle production domains
//   const parts = host.split('.');
//   if (parts.length > 2) {
//     return {
//       subdomain: parts[0],
//       domain: parts.slice(1).join('.')
//     };
//   }

//   return { subdomain: null, domain: host };
// }

// export async function middleware(request: NextRequest) {
//   const { pathname, searchParams } = request.nextUrl;
//   const host = request.headers.get('host');

//   // Skip middleware for public paths and API routes
//   if (PUBLIC_PATHS.some(path => pathname.startsWith(path)) || pathname.startsWith('/api')) {
//     return NextResponse.next();
//   }

//   // Skip if we already have a tenant_slug in the URL or if we're in a redirect loop
//   const pathSegments = pathname.split('/').filter(Boolean);
//   if (pathSegments[0] === '[tenant_slug]' || pathSegments.length > 2) {
//     return NextResponse.next();
//   }

//   try {
//     try {
//       // For testing: Hardcoded custom URL
//       console.log('Middleware host:', host);

//       const testCustomUrl = 'weai_test.localhost';
//     //   const testCustomUrl = host;

//       const apiUrl = new URL(`${TENANT_RESOLUTION_API}/resolve-tenant/`);
//       apiUrl.searchParams.append('custom_url', testCustomUrl);

//       console.log('Calling tenant resolution API:', apiUrl.toString());

//       const response = await fetch(apiUrl.toString(), {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });

//       if (response.ok) {
//         const data = await response.json();
//         const tenantSlug = data.tenant_slug;

//         if (tenantSlug) {
//           // Only redirect if we're not already on the correct path
//           if (pathSegments[0] !== tenantSlug) {
//             const newPath = `/${tenantSlug}${pathname === '/' ? '' : pathname}`;
//             console.log('Redirecting to:', newPath);

//             // Create response with redirect
//             // const response = NextResponse.redirect(new URL(newPath, request.url));
//             const response = NextResponse.rewrite(new URL(newPath, request.url)); // Serves content from another internal route without changing the URL in the browser

//             // Set cookie with SameSite=None and Secure for cross-domain
//             response.cookies.set('x-tenant-slug', tenantSlug, {
//               path: '/',
//               httpOnly: false,
//               sameSite: 'lax',
//               secure: process.env.NODE_ENV === 'production',
//             });

//             // Create a script that will run after the page loads to update localStorage
//             const script = `
//               <script>
//                 // Wait for the page to be fully loaded
//                 document.addEventListener('DOMContentLoaded', function() {
//                   try {
//                     // Check if we're on the correct tenant
//                     const currentTenant = '${tenantSlug.replace(/'/g, "\\'")}';
//                     const storedTenant = localStorage.getItem('tenant_slug');

//                     // Only update if different to prevent unnecessary writes
//                     if (storedTenant !== currentTenant) {
//                       localStorage.setItem('tenant_slug', currentTenant);
//                       console.log('Updated localStorage tenant_slug:', currentTenant);

//                       // Force a state update in the app if needed
//                       if (window.updateTenantContext) {
//                         window.updateTenantContext(currentTenant);
//                       }
//                     }
//                   } catch (e) {
//                     console.error('Failed to set tenant_slug in localStorage:', e);
//                   }
//                 });
//               </script>
//             `;

//             // Add script to set localStorage
//             response.headers.set('Content-Type', 'text/html');
//             const originalResponse = await response.text();
//             const modifiedResponse = originalResponse.replace('</head>', `${script}</head>`);

//             return new NextResponse(modifiedResponse, {
//               status: response.status,
//               headers: response.headers,
//             });
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error in tenant resolution:', error);
//     }

//     // If anything goes wrong, continue without redirecting
//     return NextResponse.next();

//   } catch (error) {
//     console.error('Error resolving tenant:', error);
//   }

//   // If we can't resolve the tenant, redirect to a default page or show an error
//   return NextResponse.redirect(new URL('/tenant-not-found', request.url));
// }

// export const config = {
//   matcher: [
//     '/((?!_next/static|_next/image|favicon.ico).*)',
//   ],
// };

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COCKPIT_API_BASE_URL } from "./utils/constants";

const TENANT_RESOLUTION_API = `${COCKPIT_API_BASE_URL}/tenant-resolution`;

// Paths that should be skipped by the middleware
const PUBLIC_PATHS = ["/login", "/_next", "/favicon.ico", "/.well-known"];

// Internal paths that should never be considered as tenant slugs
const INTERNAL_PATHS = [
  ".well-known",
  "api",
  "favicon.ico",
  "_next",
  "static",
  "assets",
  "images",
  "css",
  "js",
  "fonts",
  "login",
  "unauthorized",
  "error",
  "locales", // Add locales to prevent treating it as a tenant slug
];

/**
 * Main middleware function that handles tenant routing
 * @param request The Next.js request object
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const host = request.headers.get("host");

  // Log request details for debugging
  console.log(
    `Processing request for path: ${pathname}, host: ${host}, search params:`,
    Object.fromEntries(searchParams.entries())
  );

  // Skip middleware for public paths and API routes
  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/api")
  ) {
    console.log("Skipping middleware for public/API path");
    return NextResponse.next();
  }

  // Special handling for webhook URLs - these need to be rewritten to include the tenant slug in the path
  // but we need to maintain the query parameters
  const tenantSlugFromQuery = searchParams.get("tenant_slug");
  if (tenantSlugFromQuery && pathname.startsWith("/webhook")) {
    console.log(
      `Found tenant slug in webhook query parameters: ${tenantSlugFromQuery}`
    );

    // Create a script that will run after the page loads to update localStorage
    const script = `
      <script>
        // Wait for the page to be fully loaded
        document.addEventListener('DOMContentLoaded', function() {
          try {
            // Set tenant slug in localStorage
            const currentTenant = '${tenantSlugFromQuery.replace(/'/g, "\\'")}';
            localStorage.setItem('tenant_slug', currentTenant);
            console.log('Updated localStorage tenant_slug:', currentTenant);
            
            // Force a state update in the app if needed
            if (window.updateTenantContext) {
              window.updateTenantContext(currentTenant);
            }
          } catch (e) {
            console.error('Failed to set tenant_slug in localStorage:', e);
          }
        });
      </script>
    `;

    // Create a new URL with the tenant slug in the path
    const newPath = `/${tenantSlugFromQuery}/webhook`;
    console.log(
      `Rewriting webhook URL to include tenant slug in path: ${newPath}`
    );

    const url = request.nextUrl.clone();
    url.pathname = newPath;
    // Preserve all query parameters except tenant_slug (as it's now in the path)
    searchParams.delete("tenant_slug");

    const response = NextResponse.rewrite(url);

    // Set cookie with tenant slug
    response.cookies.set("x-tenant-slug", tenantSlugFromQuery, {
      path: "/",
      httpOnly: false, // Needs to be accessible by JavaScript
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Add script to HTML response
    response.headers.set("Content-Type", "text/html");

    console.log(
      `Set cookie and localStorage with tenant slug from query: ${tenantSlugFromQuery}`
    );
    return response;
  }

  // Handle tenant_slug in query params for non-webhook routes
  if (tenantSlugFromQuery) {
    console.log(
      `Found tenant slug in query parameters: ${tenantSlugFromQuery}`
    );

    // Extract the first path segment to check if we already have the tenant slug in the path
    const pathSegments = pathname.split("/").filter(Boolean);
    const firstSegment = pathSegments[0];

    // Only rewrite if the first segment is not already the tenant slug
    if (firstSegment !== tenantSlugFromQuery) {
      // Create a new URL with the tenant slug in the path
      const newPath = `/${tenantSlugFromQuery}${
        pathname === "/" ? "" : pathname
      }`;
      console.log(`Rewriting URL to include tenant slug in path: ${newPath}`);

      const url = request.nextUrl.clone();
      url.pathname = newPath;
      const response = NextResponse.rewrite(url);

      // Set cookie with tenant slug
      response.cookies.set("x-tenant-slug", tenantSlugFromQuery, {
        path: "/",
        httpOnly: false, // Needs to be accessible by JavaScript
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      // Add script to HTML response
      response.headers.set("Content-Type", "text/html");

      console.log(
        `Set cookie and localStorage with tenant slug from query: ${tenantSlugFromQuery}`
      );
      return response;
    } else {
      // If we already have the tenant slug in the path, just set the cookie
      console.log(
        `Tenant slug already in path, just setting cookie: ${tenantSlugFromQuery}`
      );
      const response = NextResponse.next();

      // Set cookie with tenant slug
      response.cookies.set("x-tenant-slug", tenantSlugFromQuery, {
        path: "/",
        httpOnly: false, // Needs to be accessible by JavaScript
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      return response;
    }
  }

  // Extract the first path segment
  const pathSegments = pathname.split("/").filter(Boolean);
  const firstSegment = pathSegments[0];

  // Check if we're already in a Next.js dynamic route pattern
  if (firstSegment === "[tenant_slug]") {
    console.log("Skipping middleware for Next.js dynamic route pattern");
    return NextResponse.next();
  }

  // Check if we already have a tenant slug in the cookie
  const tenantSlugFromCookie = request.cookies.get("x-tenant-slug")?.value;

  // Check if the first path segment is a valid tenant slug (not an internal path)
  if (firstSegment && !INTERNAL_PATHS.includes(firstSegment)) {
    console.log(`Valid tenant slug found in URL path: ${firstSegment}`);

    // Update the cookie if the tenant slug in the URL doesn't match the cookie
    if (firstSegment !== tenantSlugFromCookie) {
      console.log(`Updating cookie with tenant from URL path: ${firstSegment}`);
      
      // Create a script that will run after the page loads to update localStorage
      const script = `
        <script>
          // Wait for the page to be fully loaded
          document.addEventListener('DOMContentLoaded', function() {
            try {
              // Set tenant slug in localStorage
              const currentTenant = '${firstSegment.replace(/'/g, "\\'")}';
              localStorage.setItem('tenant_slug', currentTenant);
              console.log('Updated localStorage tenant_slug:', currentTenant);
              
              // Force a state update in the app if needed
              if (window.updateTenantContext) {
                window.updateTenantContext(currentTenant);
              }
            } catch (e) {
              console.error('Failed to set tenant_slug in localStorage:', e);
            }
          });
        </script>
      `;
      
      const response = NextResponse.next();
      
      // Set cookie with tenant slug
      response.cookies.set("x-tenant-slug", firstSegment, {
        path: "/",
        httpOnly: false, // Needs to be accessible by JavaScript
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      // Add script to HTML response for HTML requests
      if (request.headers.get("accept")?.includes("text/html")) {
        response.headers.set("Content-Type", "text/html");
      }
      
      console.log(`Set cookie and localStorage with tenant from URL path: ${firstSegment}`);
      return response;
    }

    // Continue with the existing URL since it already has the tenant slug
    return NextResponse.next();
  }

  // If we have a tenant slug in the cookie, but not in the URL, rewrite the URL internally
  if (
    tenantSlugFromCookie &&
    (!firstSegment || INTERNAL_PATHS.includes(firstSegment))
  ) {
    console.log(`Using tenant slug from cookie: ${tenantSlugFromCookie}`);

    // Rewrite the URL to include the tenant slug but don't change the browser URL
    const newPath = `/${tenantSlugFromCookie}${
      pathname === "/" ? "" : pathname
    }`;
    console.log(`Rewriting URL internally to: ${newPath}`);

    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.rewrite(url);
  }

  // If we don't have a tenant slug in the cookie or the URL, resolve it from the host
  try {
    console.log(`Resolving tenant from host: ${host}`);

    // Use the actual host for the API call (or fallback to a test value)
    const customUrl = host;

    // Call the tenant resolution API
    const apiUrl = new URL(`${TENANT_RESOLUTION_API}/resolve-tenant/`);
    apiUrl.searchParams.append("custom_url", customUrl || "");

    console.log(`Calling tenant resolution API: ${apiUrl.toString()}`);

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Tenant API error: ${response.status}`);
      // Don't redirect to unauthorized, just continue
      return NextResponse.next();
    }

    const data = await response.json();
    console.log("Tenant API response:", data);

    const tenantSlug = data.tenant_slug;

    if (!tenantSlug) {
      console.error("No tenant_slug in API response");
      // Don't redirect to unauthorized, just continue
      return NextResponse.next();
    }

    // Create a script that will run after the page loads to update localStorage
    const script = `
      <script>
        // Wait for the page to be fully loaded
        document.addEventListener('DOMContentLoaded', function() {
          try {
            // Set tenant slug in localStorage
            const currentTenant = '${tenantSlug.replace(/'/g, "\\'")}';
            localStorage.setItem('tenant_slug', currentTenant);
            console.log('Updated localStorage tenant_slug:', currentTenant);
            
            // Force a state update in the app if needed
            if (window.updateTenantContext) {
              window.updateTenantContext(currentTenant);
            }
          } catch (e) {
            console.error('Failed to set tenant_slug in localStorage:', e);
          }
        });
      </script>
    `;

    // Rewrite the URL to include the tenant slug
    const newPath = `/${tenantSlug}${pathname === "/" ? "" : pathname}`;
    console.log(`Rewriting URL with resolved tenant slug: ${newPath}`);

    // Rewrite the URL internally (doesn't change the browser URL)
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    const rewriteResponse = NextResponse.rewrite(url);

    // Set the tenant slug cookie
    rewriteResponse.cookies.set("x-tenant-slug", tenantSlug, {
      path: "/",
      httpOnly: false, // Allow client-side access
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Add script to HTML response
    rewriteResponse.headers.set("Content-Type", "text/html");
    console.log(
      `Set cookie and localStorage with tenant slug from API: ${tenantSlug}`
    );

    return rewriteResponse;
  } catch (error) {
    console.error("Error resolving tenant:", error);
    // If we can't resolve the tenant, just continue without redirecting
    return NextResponse.next();
  }
}

// export const config = {
//   matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
// };

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/public).*)"],
};