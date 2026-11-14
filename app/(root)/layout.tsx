import React from 'react'

// Synchronous shell so Cache Components can prerender it; the auth gate and
// per-request data fetching live in the pages (wrapped by loading.tsx's
// Suspense boundary). Pages render their own TopNav; this frame only owns
// the full-height canvas and the skip link.
const AppLayout = ({ children }: {
    children: React.ReactNode
}) => {
    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
                Skip to content
            </a>
            {children}
        </div>
    )
}

export default AppLayout