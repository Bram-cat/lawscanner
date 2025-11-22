'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card'
import { OCRResult } from '@/app/api/ocr/route'
import { SummaryResult } from '@/app/api/summarize/route'

interface DocumentReviewProps {
  ocrResult: OCRResult
  summaryResult: SummaryResult
  onClose: () => void
}

export default function DocumentReview({
  ocrResult,
  summaryResult,
  onClose,
}: DocumentReviewProps) {
  const [isExporting, setIsExporting] = useState(false)

  // Export document analysis
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const exportData = {
        meta: ocrResult.meta,
        summary: summaryResult,
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${ocrResult.meta.filename.replace(/\.[^/.]+$/, '')}-analysis.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [ocrResult, summaryResult])

  // Get risk score color
  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-600 bg-green-50'
    if (score <= 6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Summary - One Liner at Top */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
              Document Summary
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-carbon-black leading-tight">
              {summaryResult.short_summary}
            </h2>
            <div className="mt-4 flex items-center gap-4 text-sm text-charcoal-brown">
              <span>{ocrResult.meta.filename}</span>
              <span>•</span>
              <span>{ocrResult.meta.pages} page(s)</span>
              <span>•</span>
              <span>
                {Math.round(summaryResult.confidence_score * 100)}% confidence
              </span>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button variant="outline" onClick={onClose}>
              New Document
            </Button>
            <Button onClick={handleExport} loading={isExporting}>
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Key Highlights */}
      {summaryResult.key_highlights && summaryResult.key_highlights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-carbon-black">
            Key Highlights
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {summaryResult.key_highlights.map((highlight, idx) => (
              <div
                key={idx}
                className="p-4 bg-floral-white border border-silver/30 rounded-xl hover:border-primary/30 transition-colors"
              >
                <h4 className="font-semibold text-carbon-black mb-1">
                  {highlight.topic}
                </h4>
                <p className="text-sm text-charcoal-brown">
                  {highlight.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Summary */}
      {summaryResult.detailed_summary && (
        <Card>
          <CardHeader>
            <CardTitle>Document Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {summaryResult.detailed_summary.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-charcoal-brown mb-4 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis - Scrollable Content */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-carbon-black">
          Detailed Analysis
        </h3>

        {/* Key Information Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Parties Involved */}
          <Card>
            <CardHeader>
              <CardTitle>Parties Involved</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryResult.parties.length > 0 ? (
                <ul className="space-y-3">
                  {summaryResult.parties.map((party, idx) => (
                    <li key={idx} className="border-l-2 border-primary pl-3">
                      <p className="font-medium text-carbon-black">{party.name}</p>
                      <p className="text-sm text-charcoal-brown">{party.role}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-brown/70 italic">
                  No parties identified in document
                </p>
              )}
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Key Dates</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryResult.important_dates.length > 0 ? (
                <ul className="space-y-3">
                  {summaryResult.important_dates.map((date, idx) => (
                    <li key={idx} className="border-l-2 border-primary pl-3">
                      <p className="font-medium text-carbon-black">{date.date}</p>
                      <p className="text-sm text-charcoal-brown">{date.type}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-brown/70 italic">
                  No key dates identified
                </p>
              )}
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card>
            <CardHeader>
              <CardTitle>Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryResult.governing_law ? (
                <p className="text-carbon-black font-medium">
                  {summaryResult.governing_law}
                </p>
              ) : (
                <p className="text-sm text-charcoal-brown/70 italic">
                  Not specified in document
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Obligations */}
        {summaryResult.obligations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Obligations & Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summaryResult.obligations.map((obligation, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 bg-floral-white rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {idx + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-carbon-black">
                        {obligation.who}
                      </p>
                      <p className="text-sm text-charcoal-brown mt-1">
                        {obligation.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment & Termination Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Payment Terms */}
          {summaryResult.payment_terms && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-charcoal-brown">{summaryResult.payment_terms}</p>
              </CardContent>
            </Card>
          )}

          {/* Termination Clauses */}
          {summaryResult.termination_clauses && (
            <Card>
              <CardHeader>
                <CardTitle>Termination Clauses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-charcoal-brown">
                  {summaryResult.termination_clauses}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Risk Analysis */}
        {summaryResult.risk_flags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summaryResult.risk_flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 p-4 rounded-lg ${getRiskColor(
                      flag.score
                    )}`}
                  >
                    <div className="flex-shrink-0 font-bold text-lg">
                      {flag.score}/10
                    </div>
                    <p className="text-sm">{flag.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggested Redactions */}
        {summaryResult.suggested_redactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sensitive Information Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-charcoal-brown mb-4">
                The following sensitive information was detected and may need to
                be redacted before sharing:
              </p>
              <ul className="space-y-2">
                {summaryResult.suggested_redactions.map((redaction, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 bg-red-50 text-red-700 rounded"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>
                      Page {redaction.page}: {redaction.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
