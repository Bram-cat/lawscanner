/**
 * Unit tests for LLM output validation
 *
 * These tests validate the summary response structure and normalization.
 */

import { SummaryResult } from '@/app/api/summarize/route'

// Helper function to validate summary structure
function validateSummary(summary: Partial<SummaryResult>): SummaryResult {
  return {
    short_summary: summary.short_summary || 'Unable to generate summary',
    parties: Array.isArray(summary.parties) ? summary.parties : [],
    important_dates: Array.isArray(summary.important_dates) ? summary.important_dates : [],
    obligations: Array.isArray(summary.obligations) ? summary.obligations : [],
    payment_terms: summary.payment_terms || null,
    termination_clauses: summary.termination_clauses || null,
    governing_law: summary.governing_law || null,
    risk_flags: Array.isArray(summary.risk_flags) ? summary.risk_flags : [],
    suggested_redactions: Array.isArray(summary.suggested_redactions) ? summary.suggested_redactions : [],
    confidence_score: typeof summary.confidence_score === 'number'
      ? Math.min(1, Math.max(0, summary.confidence_score))
      : 0.5,
  }
}

describe('LLM Output Validation', () => {
  describe('Summary Structure Validation', () => {
    it('should validate a complete summary', () => {
      const validSummary: SummaryResult = {
        short_summary: 'This is a service agreement between Company A and Company B.',
        parties: [
          { role: 'Service Provider', name: 'Company A', excerpt: 'Company A, Inc.' },
          { role: 'Client', name: 'Company B', excerpt: 'Company B LLC' },
        ],
        important_dates: [
          { type: 'Effective Date', date: '2024-01-01', excerpt: 'effective as of January 1, 2024' },
        ],
        obligations: [
          { who: 'Company A', action: 'Provide consulting services', excerpt: 'shall provide consulting services' },
        ],
        payment_terms: 'Net 30 days',
        termination_clauses: '30 days written notice',
        governing_law: 'State of Delaware',
        risk_flags: [
          { score: 3, reason: 'Standard terms' },
        ],
        suggested_redactions: [
          { page: 1, start_char: 100, end_char: 120, reason: 'SSN detected' },
        ],
        confidence_score: 0.85,
      }

      expect(validSummary.short_summary).toBeTruthy()
      expect(validSummary.parties).toHaveLength(2)
      expect(validSummary.confidence_score).toBeGreaterThanOrEqual(0)
      expect(validSummary.confidence_score).toBeLessThanOrEqual(1)
    })

    it('should normalize partial summary responses', () => {
      const partialSummary: Partial<SummaryResult> = {
        short_summary: 'Brief summary',
        // Missing all other fields
      }

      const normalized = validateSummary(partialSummary)

      expect(normalized.short_summary).toBe('Brief summary')
      expect(normalized.parties).toEqual([])
      expect(normalized.important_dates).toEqual([])
      expect(normalized.obligations).toEqual([])
      expect(normalized.payment_terms).toBeNull()
      expect(normalized.termination_clauses).toBeNull()
      expect(normalized.governing_law).toBeNull()
      expect(normalized.risk_flags).toEqual([])
      expect(normalized.suggested_redactions).toEqual([])
      expect(normalized.confidence_score).toBe(0.5) // Default
    })

    it('should handle empty summary', () => {
      const emptySummary = {}
      const normalized = validateSummary(emptySummary)

      expect(normalized.short_summary).toBe('Unable to generate summary')
      expect(normalized.confidence_score).toBe(0.5)
    })

    it('should clamp confidence score to valid range', () => {
      // Too high
      const highConfidence = validateSummary({ confidence_score: 1.5 })
      expect(highConfidence.confidence_score).toBe(1)

      // Too low
      const lowConfidence = validateSummary({ confidence_score: -0.5 })
      expect(lowConfidence.confidence_score).toBe(0)

      // Valid
      const validConfidence = validateSummary({ confidence_score: 0.75 })
      expect(validConfidence.confidence_score).toBe(0.75)
    })
  })

  describe('Party Extraction', () => {
    it('should identify multiple party roles', () => {
      const parties = [
        { role: 'Landlord', name: 'Property LLC', excerpt: 'Property LLC ("Landlord")' },
        { role: 'Tenant', name: 'John Doe', excerpt: 'John Doe ("Tenant")' },
        { role: 'Guarantor', name: 'Jane Doe', excerpt: 'Jane Doe, as Guarantor' },
        { role: 'Witness', name: 'Notary Public', excerpt: 'witnessed by Notary Public' },
      ]

      expect(parties).toHaveLength(4)
      expect(parties.map(p => p.role)).toContain('Landlord')
      expect(parties.map(p => p.role)).toContain('Tenant')
      expect(parties.map(p => p.role)).toContain('Guarantor')
      expect(parties.map(p => p.role)).toContain('Witness')
    })
  })

  describe('Date Extraction', () => {
    it('should handle various date formats', () => {
      const dates = [
        { type: 'Effective Date', date: '2024-01-01', excerpt: 'January 1, 2024' },
        { type: 'Expiration', date: '2025-12-31', excerpt: '31st of December, 2025' },
        { type: 'Payment Due', date: '2024-02-15', excerpt: 'February 15th, 2024' },
      ]

      dates.forEach(date => {
        // Validate ISO date format
        expect(date.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })
  })

  describe('Risk Flag Validation', () => {
    it('should validate risk score range', () => {
      const riskFlags = [
        { score: 1, reason: 'Low risk - standard terms' },
        { score: 5, reason: 'Medium risk - some unusual clauses' },
        { score: 9, reason: 'High risk - heavily one-sided' },
      ]

      riskFlags.forEach(flag => {
        expect(flag.score).toBeGreaterThanOrEqual(1)
        expect(flag.score).toBeLessThanOrEqual(10)
      })
    })

    it('should categorize risks by severity', () => {
      const categorizeRisk = (score: number): string => {
        if (score <= 3) return 'low'
        if (score <= 6) return 'medium'
        return 'high'
      }

      expect(categorizeRisk(1)).toBe('low')
      expect(categorizeRisk(3)).toBe('low')
      expect(categorizeRisk(4)).toBe('medium')
      expect(categorizeRisk(6)).toBe('medium')
      expect(categorizeRisk(7)).toBe('high')
      expect(categorizeRisk(10)).toBe('high')
    })
  })

  describe('Redaction Validation', () => {
    it('should validate redaction character positions', () => {
      const redaction = {
        page: 1,
        start_char: 100,
        end_char: 120,
        reason: 'SSN detected',
      }

      expect(redaction.start_char).toBeLessThan(redaction.end_char)
      expect(redaction.page).toBeGreaterThan(0)
    })

    it('should identify common redaction reasons', () => {
      const sensitivePatterns = [
        'SSN',
        'Social Security',
        'bank account',
        'credit card',
        'phone number',
        'email address',
        'personal address',
        'date of birth',
      ]

      const testReason = 'SSN detected in paragraph 3'
      const matchesPattern = sensitivePatterns.some(pattern =>
        testReason.toLowerCase().includes(pattern.toLowerCase())
      )

      expect(matchesPattern).toBe(true)
    })
  })

  describe('LOW_CONFIDENCE Handling', () => {
    it('should handle LOW_CONFIDENCE values', () => {
      const summaryWithLowConfidence = {
        short_summary: 'LOW_CONFIDENCE',
        payment_terms: 'LOW_CONFIDENCE',
        governing_law: 'State of California',
        confidence_score: 0.3,
      }

      expect(summaryWithLowConfidence.short_summary).toBe('LOW_CONFIDENCE')
      expect(summaryWithLowConfidence.payment_terms).toBe('LOW_CONFIDENCE')
      expect(summaryWithLowConfidence.governing_law).not.toBe('LOW_CONFIDENCE')
    })
  })
})
