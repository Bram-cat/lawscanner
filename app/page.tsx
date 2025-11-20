'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import DocumentReview from '@/components/DocumentReview'
import { OCRResult } from '@/app/api/ocr/route'
import { SummaryResult } from '@/app/api/summarize/route'

type ProcessingState = 'idle' | 'uploading' | 'ocr' | 'summarizing' | 'complete' | 'error'

interface ProcessingResult {
  ocrResult: OCRResult | null
  summaryResult: SummaryResult | null
}

export default function Home() {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ProcessingResult>({
    ocrResult: null,
    summaryResult: null,
  })
  const [showReview, setShowReview] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return

    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF or image file.')
      return
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setError(null)
    setProcessingState('uploading')
    setProgress(10)

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file)
      setProgress(30)

      // Step 1: OCR Processing
      setProcessingState('ocr')
      setProgress(40)

      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: base64,
          filename: file.name,
          mimeType: file.type,
        }),
      })

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json()
        throw new Error(errorData.error || 'OCR processing failed')
      }

      const ocrResult: OCRResult = await ocrResponse.json()
      setProgress(70)

      // Step 2: AI Summarization
      setProcessingState('summarizing')

      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocr_result: ocrResult,
          user_instructions: 'Analyze this legal document and make it easy to understand for business owners',
        }),
      })

      if (!summaryResponse.ok) {
        const errorData = await summaryResponse.json()
        throw new Error(errorData.error || 'AI analysis failed')
      }

      const summaryResult: SummaryResult = await summaryResponse.json()
      setProgress(100)

      setResults({ ocrResult, summaryResult })
      setProcessingState('complete')
      setShowReview(true)
    } catch (err) {
      console.error('Processing error:', err)
      setError(err instanceof Error ? err.message : 'Processing failed')
      setProcessingState('error')
    }
  }, [])

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // Reset state
  const handleReset = useCallback(() => {
    setProcessingState('idle')
    setProgress(0)
    setError(null)
    setResults({ ocrResult: null, summaryResult: null })
    setShowReview(false)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {showReview && results.ocrResult && results.summaryResult ? (
          <DocumentReview
            ocrResult={results.ocrResult}
            summaryResult={results.summaryResult}
            onClose={handleReset}
          />
        ) : (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                <svg
                  className="w-8 h-8 text-primary"
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
              <h1 className="text-4xl md:text-5xl font-bold text-carbon-black">
                LawScanner AI
              </h1>
              <p className="text-xl text-charcoal-brown max-w-2xl mx-auto">
                Understand complex legal documents in seconds. Upload any legal PDF
                and get a clear, plain-English summary.
              </p>
            </div>

            {/* Upload Section */}
            <div className="max-w-2xl mx-auto">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                  transition-all duration-200
                  ${
                    processingState === 'idle'
                      ? 'border-silver hover:border-primary hover:bg-primary/5'
                      : 'border-silver/50 bg-silver/10 cursor-not-allowed'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                  className="hidden"
                  disabled={processingState !== 'idle'}
                />

                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mx-auto">
                    <svg
                      className="w-10 h-10 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>

                  {processingState === 'idle' ? (
                    <>
                      <div>
                        <p className="text-lg font-medium text-carbon-black">
                          Drop your legal document here
                        </p>
                        <p className="text-charcoal-brown mt-1">
                          or click to browse
                        </p>
                      </div>
                      <p className="text-sm text-charcoal-brown/70">
                        Supports PDF, PNG, JPG, TIFF • Max 10MB
                      </p>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-medium text-carbon-black">
                          {processingState === 'uploading' && 'Uploading document...'}
                          {processingState === 'ocr' && 'Extracting text with OCR...'}
                          {processingState === 'summarizing' && 'Analyzing with AI...'}
                          {processingState === 'error' && 'Error occurred'}
                        </p>
                        {processingState !== 'error' && (
                          <p className="text-charcoal-brown mt-1">
                            {progress}% complete
                          </p>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {processingState !== 'error' && (
                        <div className="max-w-xs mx-auto">
                          <div className="h-2 bg-silver/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                      <button
                        onClick={() => {
                          setError(null)
                          setProcessingState('idle')
                          setProgress(0)
                        }}
                        className="text-sm text-red-600 underline mt-2"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto mt-16">
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
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
                <h3 className="font-semibold text-carbon-black mb-2">
                  Instant OCR
                </h3>
                <p className="text-sm text-charcoal-brown">
                  Extract all text from PDFs and scanned documents with high accuracy
                </p>
              </div>

              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-carbon-black mb-2">
                  AI Analysis
                </h3>
                <p className="text-sm text-charcoal-brown">
                  Powered by Google Gemini to understand complex legal language
                </p>
              </div>

              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-carbon-black mb-2">
                  Plain English
                </h3>
                <p className="text-sm text-charcoal-brown">
                  Get summaries in simple language, not legalese
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
