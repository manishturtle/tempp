import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const pathParts = pathname.split('/').filter(Boolean)

  // Only process if we have a tenant segment
  if (pathParts.length >= 1) {
    const tenant = pathParts[0]
    
    // Check if the tenant is not in the expected case (e.g., contains uppercase)
    if (tenant !== tenant.toLowerCase()) {
      // Create a new URL with the lowercase tenant
      const newUrl = new URL(request.url)
      newUrl.pathname = newUrl.pathname.replace(
        `/${pathParts[0]}/`,
        `/${tenant.toLowerCase()}/`
      )
      
      // Redirect to the lowercase version
      return NextResponse.redirect(newUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  // Define paths that should be processed by the middleware
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    // Only match paths with a tenant segment
    '/:tenant*'
  ],
}
