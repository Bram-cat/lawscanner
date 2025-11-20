'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Scanbot SDK Types (simplified for demonstration)
interface ScanbotSDK {
  initialize: (config: ScanbotConfig) => Promise<void>
  createDocumentScanner: (config: DocumentScannerConfig) => Promise<DocumentScanner>
  createPdfGenerator: () => Promise<PdfGenerator>
}

interface ScanbotConfig {
  licenseKey: string
  engine: string
}

interface DocumentScannerConfig {
  containerId: string
  onDocumentDetected: (result: DocumentDetectionResult) => void
  onError: (error: Error) => void
  style?: {
    outline?: {
      polygon?: {
        strokeColor?: string
        fillColor?: string
      }
    }
  }
}

interface DocumentDetectionResult {
  success: boolean
  pages: ScannedPage[]
  quality: number
}

interface ScannedPage {
  id: string
  imageData: string
  originalImage: string
  polygon: number[][]
  quality: number
}

interface DocumentScanner {
  start: () => Promise<void>
  stop: () => Promise<void>
  dispose: () => Promise<void>
  captureDocument: () => Promise<ScannedPage>
}

interface PdfGenerator {
  generate: (pages: ScannedPage[]) => Promise<Blob>
}

interface CaptureScannerProps {
  onCapture: (pdfBase64: string) => void
  onClose: () => void
  licenseKey?: string
}

export default function CaptureScanner({
  onCapture,
  onClose,
  licenseKey = '',
}: CaptureScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<DocumentScanner | null>(null)
  const sdkRef = useRef<ScanbotSDK | null>(null)

  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [capturedPages, setCapturedPages] = useState<ScannedPage[]>([])
  const [quality, setQuality] = useState<number>(0)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Initialize Scanbot SDK
  useEffect(() => {
    const initializeScanner = async () => {
      try {
        // Dynamic import of Scanbot SDK
        // NOTE: In production, you need to import the actual Scanbot Web SDK
        // import ScanbotSDK from 'scanbot-web-sdk'

        // For demonstration, we'll create a mock SDK
        // Replace this with actual Scanbot SDK initialization
        const ScanbotSDK = await import('scanbot-web-sdk').then(
          (mod) => mod.default
        ).catch(() => {
          // Fallback mock for development without SDK
          return createMockScanbotSDK()
        })

        const sdk = new ScanbotSDK()

        await sdk.initialize({
          // TODO: Add your Scanbot license key here
          // Get your license key from https://scanbot.io
          licenseKey: licenseKey || process.env.NEXT_PUBLIC_SCANBOT_LICENSE_KEY || '',
          engine: 'wasm',
        })

        sdkRef.current = sdk

        if (containerRef.current) {
          const scanner = await sdk.createDocumentScanner({
            containerId: 'scanbot-container',
            onDocumentDetected: (result: DocumentDetectionResult) => {
              if (result.success && result.quality > 0.7) {
                setQuality(result.quality)
              }
            },
            onError: (err: Error) => {
              console.error('Scanner error:', err)
              setError(err.message)
            },
            style: {
              outline: {
                polygon: {
                  strokeColor: '#eb5e28',
                  fillColor: 'rgba(235, 94, 40, 0.1)',
                },
              },
            },
          })

          scannerRef.current = scanner
          await scanner.start()
        }

        setIsInitializing(false)
      } catch (err) {
        console.error('Failed to initialize scanner:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize scanner')
        setIsInitializing(false)
      }
    }

    initializeScanner()

    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.dispose()
      }
    }
  }, [licenseKey])

  // Capture current document
  const handleCapture = useCallback(async () => {
    if (!scannerRef.current) return

    setIsCapturing(true)
    try {
      const page = await scannerRef.current.captureDocument()
      setCapturedPages((prev) => [...prev, page])
      setQuality(page.quality)
    } catch (err) {
      console.error('Capture failed:', err)
      setError(err instanceof Error ? err.message : 'Capture failed')
    } finally {
      setIsCapturing(false)
    }
  }, [])

  // Generate PDF and return base64
  const handleFinish = useCallback(async () => {
    if (capturedPages.length === 0) {
      setError('No pages captured')
      return
    }

    setIsGeneratingPdf(true)
    try {
      if (sdkRef.current) {
        const pdfGenerator = await sdkRef.current.createPdfGenerator()
        const pdfBlob = await pdfGenerator.generate(capturedPages)

        // Convert blob to base64
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          // Remove data URL prefix
          const base64Data = base64.split(',')[1]
          onCapture(base64Data)
        }
        reader.readAsDataURL(pdfBlob)
      }
    } catch (err) {
      console.error('PDF generation failed:', err)
      setError(err instanceof Error ? err.message : 'PDF generation failed')
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [capturedPages, onCapture])

  // Remove a captured page
  const handleRemovePage = useCallback((pageId: string) => {
    setCapturedPages((prev) => prev.filter((p) => p.id !== pageId))
  }, [])

  // Get quality indicator class
  const getQualityClass = (q: number) => {
    if (q >= 0.8) return 'confidence-high'
    if (q >= 0.5) return 'confidence-medium'
    return 'confidence-low'
  }

  const getQualityLabel = (q: number) => {
    if (q >= 0.8) return 'Excellent'
    if (q >= 0.5) return 'Good'
    return 'Poor'
  }

  return (
    <div className="scanner-overlay">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-silver/30">
          <h2 className="text-lg font-semibold text-carbon-black">
            Scan Document
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-charcoal-brown hover:text-carbon-black transition-colors"
            aria-label="Close scanner"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scanner View */}
        <div className="p-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm underline"
              >
                Dismiss
              </button>
            </div>
          ) : isInitializing ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-charcoal-brown">Initializing camera...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Camera View */}
              <div
                id="scanbot-container"
                ref={containerRef}
                className="scanbot-container aspect-[4/3]"
              />

              {/* Quality Indicator */}
              {quality > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-charcoal-brown">Quality:</span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getQualityClass(
                      quality
                    )}`}
                  >
                    {getQualityLabel(quality)} ({Math.round(quality * 100)}%)
                  </span>
                </div>
              )}

              {/* Captured Pages Preview */}
              {capturedPages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-charcoal-brown">
                    Captured Pages ({capturedPages.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {capturedPages.map((page, index) => (
                      <div
                        key={page.id}
                        className="relative flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden border border-silver group"
                      >
                        <img
                          src={page.imageData}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemovePage(page.id)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          aria-label={`Remove page ${index + 1}`}
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                        <span className="absolute bottom-1 left-1 text-xs bg-carbon-black/70 text-white px-1 rounded">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-silver/30 bg-floral-white">
          <button
            onClick={onClose}
            className="btn-outline"
            disabled={isCapturing || isGeneratingPdf}
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCapture}
              className="btn-secondary"
              disabled={isInitializing || isCapturing || !!error}
            >
              {isCapturing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Capturing...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Capture Page
                </>
              )}
            </button>
            <button
              onClick={handleFinish}
              className="btn-primary"
              disabled={
                capturedPages.length === 0 || isCapturing || isGeneratingPdf
              }
            >
              {isGeneratingPdf ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Finish ({capturedPages.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mock Scanbot SDK for development/testing without actual license
function createMockScanbotSDK() {
  return class MockScanbotSDK {
    async initialize(_config: ScanbotConfig) {
      console.log('Mock Scanbot SDK initialized')
    }

    async createDocumentScanner(config: DocumentScannerConfig) {
      return {
        start: async () => {
          console.log('Mock scanner started')
        },
        stop: async () => {
          console.log('Mock scanner stopped')
        },
        dispose: async () => {
          console.log('Mock scanner disposed')
        },
        captureDocument: async (): Promise<ScannedPage> => {
          // Generate mock page data
          return {
            id: `page-${Date.now()}`,
            imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            originalImage: '',
            polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
            quality: 0.85,
          }
        },
      }
    }

    async createPdfGenerator(): Promise<PdfGenerator> {
      return {
        generate: async (_pages: ScannedPage[]): Promise<Blob> => {
          // Return a minimal valid PDF blob for testing
          const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF'
          return new Blob([pdfContent], { type: 'application/pdf' })
        },
      }
    }
  }
}
