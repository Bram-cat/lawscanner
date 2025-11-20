/**
 * Test Pipeline Script
 *
 * Runs the full LawScanner pipeline with a sample PDF.
 * Usage: npm run test:pipeline
 *
 * Environment variables:
 * - SKIP_LLM=true: Skip LLM summarization (use mock response)
 * - OCR_PROVIDER: 'google' or 'aws'
 */

import fs from 'fs'
import path from 'path'

// Sample PDF as base64 (minimal valid PDF)
const SAMPLE_PDF_BASE64 = 'JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo1MCA3MDAgVGQKKFNhbXBsZSBMZWdhbCBEb2N1bWVudCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1MiAwMDAwMCBuIAowMDAwMDAwMDk1IDAwMDAwIG4gCjAwMDAwMDAyMjAgMDAwMDAgbiAKMDAwMDAwMDI5MSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjM4NQolJUVPRg=='

interface TestResult {
  success: boolean
  step: string
  duration: number
  data?: unknown
  error?: string
}

async function runTest(): Promise<void> {
  console.log('🔍 LawScanner Pipeline Test')
  console.log('=' .repeat(50))
  console.log('')

  const results: TestResult[] = []
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

  // Check if SKIP_LLM is set
  if (process.env.SKIP_LLM === 'true') {
    console.log('ℹ️  SKIP_LLM is set - will use mock LLM response')
  }

  console.log(`📡 Testing against: ${baseUrl}`)
  console.log(`📦 OCR Provider: ${process.env.OCR_PROVIDER || 'google (default)'}`)
  console.log('')

  // Step 1: Test OCR endpoint
  console.log('Step 1: Testing OCR endpoint...')
  const ocrStart = Date.now()

  try {
    const ocrResponse = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: SAMPLE_PDF_BASE64,
        filename: 'test-document.pdf',
        mimeType: 'application/pdf',
      }),
    })

    const ocrDuration = Date.now() - ocrStart

    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json()
      results.push({
        success: false,
        step: 'OCR',
        duration: ocrDuration,
        error: errorData.error || 'OCR request failed',
      })
      console.log(`❌ OCR failed: ${errorData.error}`)
    } else {
      const ocrData = await ocrResponse.json()
      results.push({
        success: true,
        step: 'OCR',
        duration: ocrDuration,
        data: {
          pages: ocrData.meta?.pages,
          provider: ocrData.meta?.provider,
          textLength: ocrData.ocr?.[0]?.text?.length || 0,
        },
      })
      console.log(`✅ OCR completed in ${ocrDuration}ms`)
      console.log(`   - Pages: ${ocrData.meta?.pages}`)
      console.log(`   - Provider: ${ocrData.meta?.provider}`)
      console.log(`   - Text extracted: ${ocrData.ocr?.[0]?.text?.length || 0} chars`)

      // Step 2: Test Summarize endpoint
      console.log('')
      console.log('Step 2: Testing Summarize endpoint...')
      const summaryStart = Date.now()

      try {
        const summaryResponse = await fetch(`${baseUrl}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ocr_result: ocrData,
            user_instructions: 'Analyze this test document',
          }),
        })

        const summaryDuration = Date.now() - summaryStart

        if (!summaryResponse.ok) {
          const errorData = await summaryResponse.json()
          results.push({
            success: false,
            step: 'Summarize',
            duration: summaryDuration,
            error: errorData.error || 'Summarization request failed',
          })
          console.log(`❌ Summarization failed: ${errorData.error}`)
        } else {
          const summaryData = await summaryResponse.json()
          results.push({
            success: true,
            step: 'Summarize',
            duration: summaryDuration,
            data: {
              hasShortSummary: !!summaryData.short_summary,
              partiesCount: summaryData.parties?.length || 0,
              datesCount: summaryData.important_dates?.length || 0,
              confidenceScore: summaryData.confidence_score,
            },
          })
          console.log(`✅ Summarization completed in ${summaryDuration}ms`)
          console.log(`   - Summary: ${summaryData.short_summary?.substring(0, 50)}...`)
          console.log(`   - Parties found: ${summaryData.parties?.length || 0}`)
          console.log(`   - Dates found: ${summaryData.important_dates?.length || 0}`)
          console.log(`   - Confidence: ${Math.round((summaryData.confidence_score || 0) * 100)}%`)
        }
      } catch (error) {
        const summaryDuration = Date.now() - summaryStart
        results.push({
          success: false,
          step: 'Summarize',
          duration: summaryDuration,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        console.log(`❌ Summarization error: ${error}`)
      }
    }
  } catch (error) {
    const ocrDuration = Date.now() - ocrStart
    results.push({
      success: false,
      step: 'OCR',
      duration: ocrDuration,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    console.log(`❌ OCR error: ${error}`)
  }

  // Summary
  console.log('')
  console.log('=' .repeat(50))
  console.log('📊 Test Summary')
  console.log('')

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`✅ Passed: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏱️  Total duration: ${totalDuration}ms`)
  console.log('')

  if (failed > 0) {
    console.log('Failed steps:')
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.step}: ${r.error}`)
      })
    process.exit(1)
  } else {
    console.log('🎉 All tests passed!')
    process.exit(0)
  }
}

// Run the test
runTest().catch((error) => {
  console.error('Test runner error:', error)
  process.exit(1)
})
