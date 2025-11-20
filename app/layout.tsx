import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LawScanner - Legal Document Scanner & Summarizer',
  description: 'Scan, OCR, and summarize legal documents with AI-powered analysis',
  keywords: ['legal', 'document', 'scanner', 'OCR', 'AI', 'summarizer'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="border-b border-silver/30 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-carbon-black">
                    LawScanner
                  </span>
                </div>
                <nav className="flex items-center gap-4">
                  <a
                    href="/"
                    className="text-sm font-medium text-charcoal-brown hover:text-primary transition-colors"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/documents"
                    className="text-sm font-medium text-charcoal-brown hover:text-primary transition-colors"
                  >
                    Documents
                  </a>
                  <a
                    href="/settings"
                    className="text-sm font-medium text-charcoal-brown hover:text-primary transition-colors"
                  >
                    Settings
                  </a>
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-silver/30 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-charcoal-brown">
                  &copy; {new Date().getFullYear()} LawScanner. All rights reserved.
                </p>
                <div className="flex items-center gap-4 text-sm text-charcoal-brown">
                  <a href="/privacy" className="hover:text-primary">
                    Privacy Policy
                  </a>
                  <a href="/terms" className="hover:text-primary">
                    Terms of Service
                  </a>
                  <a href="/gdpr" className="hover:text-primary">
                    GDPR
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
