import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { OCRResult } from '../ocr/route'

// Types for summary response
export interface Party {
  role: string
  name: string
  excerpt: string
}

export interface ImportantDate {
  type: string
  date: string
  excerpt: string
}

export interface Obligation {
  who: string
  action: string
  excerpt: string
}

export interface RiskFlag {
  score: number // 1-10
  reason: string
}

export interface SuggestedRedaction {
  page: number
  start_char: number
  end_char: number
  reason: string
}

export interface SummaryResult {
  short_summary: string
  parties: Party[]
  important_dates: ImportantDate[]
  obligations: Obligation[]
  payment_terms: string | null
  termination_clauses: string | null
  governing_law: string | null
  risk_flags: RiskFlag[]
  suggested_redactions: SuggestedRedaction[]
  confidence_score: number
}

// System prompt for Gemini
const SYSTEM_PROMPT = `You are LawScanner AI Assistant. You analyze legal documents and extract structured information for businesses who struggle with complex legal language.

Your task is to analyze the provided legal document OCR data and create a comprehensive, easy-to-understand summary.

Input Format: JSON with {meta: {filename, pages}, ocr: [{page, text, blocks: [...], entities:[{type, text, page, confidence}]}], user_instructions: string}

Output Format: JSON with {
  short_summary: "A single clear sentence (10-20 words) explaining what this document is about in plain business language",
  parties: [{role, name, excerpt}],
  important_dates: [{type, date, excerpt}],
  obligations: [{who, action, excerpt}],
  payment_terms: "string or null",
  termination_clauses: "string or null",
  governing_law: "string or null",
  risk_flags: [{score (1-10), reason}],
  suggested_redactions: [{page, start_char, end_char, reason}],
  confidence_score: 0.0 to 1.0
}

Guidelines:
1. **short_summary**: Write ONE clear sentence that any businessperson can understand. Focus on: What IS this document? Use plain English, avoid legal jargon.
2. **parties**: List ALL parties involved with clear roles (e.g., "Service Provider", "Client", "Guarantor", "Witness")
3. **important_dates**: Extract key dates like effective date, expiration, payment deadlines, milestones
4. **obligations**: What each party must DO. Be specific and actionable.
5. **payment_terms**: Extract payment amounts, schedules, and conditions
6. **termination_clauses**: How can this agreement be ended?
7. **governing_law**: Which state/country law applies?
8. **risk_flags**: Identify potential concerns (score 1-10, where 1=minimal risk, 10=critical risk)
   - Look for: unusual clauses, missing protections, one-sided terms, ambiguous language
9. **suggested_redactions**: Flag sensitive info (SSN, bank accounts, addresses, phone numbers)
10. **confidence_score**: Your confidence in the analysis (0-1)

Special Rules:
- If you can't determine something with confidence, use null or "UNKNOWN" with LOW confidence score
- Use clear, simple business language - imagine explaining to someone without legal training
- Be precise and factual - NO legal advice language (avoid "you should", "you must")
- Always return valid JSON only, no markdown, no additional text

Response MUST be valid JSON only.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ocr_result, user_instructions } = body

    if (!ocr_result) {
      return NextResponse.json(
        { error: 'No OCR result provided' },
        { status: 400 }
      )
    }

    // Check if LLM should be skipped (for testing)
    if (process.env.SKIP_LLM === 'true') {
      return NextResponse.json(getMockSummary())
    }

    // Validate OCR result structure
    const ocrData = ocr_result as OCRResult
    if (!ocrData.meta || !ocrData.ocr) {
      return NextResponse.json(
        { error: 'Invalid OCR result structure' },
        { status: 400 }
      )
    }

    // Initialize Gemini AI
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set - using mock response')
      return NextResponse.json(getMockSummary())
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
      },
    })

    // Prepare input for Gemini
    const input = {
      meta: ocrData.meta,
      ocr: ocrData.ocr.map((page) => ({
        page: page.page,
        text: page.text,
        blocks: page.blocks.slice(0, 50), // Limit blocks to reduce token usage
        entities: page.entities,
      })),
      user_instructions: user_instructions || 'Analyze this legal document thoroughly',
    }

    // Create the prompt
    const prompt = `${SYSTEM_PROMPT}\n\nDocument Data:\n${JSON.stringify(input, null, 2)}\n\nAnalyze this document and respond with ONLY valid JSON matching the specified format.`

    // Call Gemini API
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON response
    let summary: SummaryResult
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      summary = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text)
      throw new Error('Failed to parse summary response')
    }

    // Validate and normalize
    summary = validateAndNormalizeSummary(summary)

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Summarization error:', error)

    return NextResponse.json(
      {
        error: 'Summarization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Validate and normalize the summary response
 */
function validateAndNormalizeSummary(summary: Partial<SummaryResult>): SummaryResult {
  return {
    short_summary: summary.short_summary || 'Unable to generate summary - document analysis incomplete',
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

/**
 * Get mock summary for testing
 */
function getMockSummary(): SummaryResult {
  return {
    short_summary: 'This is a service agreement between two companies establishing terms for consulting services.',
    parties: [
      {
        role: 'Service Provider',
        name: 'Example Consulting LLC',
        excerpt: 'Example Consulting LLC, a Delaware limited liability company',
      },
      {
        role: 'Client',
        name: 'Business Corp',
        excerpt: 'Business Corp, a California corporation',
      },
    ],
    important_dates: [
      {
        type: 'Effective Date',
        date: '2024-01-15',
        excerpt: 'This Agreement is effective as of January 15, 2024',
      },
      {
        type: 'Initial Term End',
        date: '2025-01-15',
        excerpt: 'The initial term shall end on January 15, 2025',
      },
    ],
    obligations: [
      {
        who: 'Service Provider',
        action: 'Provide monthly consulting services as outlined in Exhibit A',
        excerpt: 'Provider shall deliver consulting services according to the scope in Exhibit A',
      },
      {
        who: 'Client',
        action: 'Pay invoices within 30 days of receipt',
        excerpt: 'Client agrees to pay all invoices within thirty (30) days',
      },
    ],
    payment_terms: 'Monthly invoicing with Net 30 payment terms. Late payments subject to 1.5% monthly interest.',
    termination_clauses: 'Either party may terminate with 30 days written notice. Immediate termination allowed for material breach.',
    governing_law: 'State of Delaware',
    risk_flags: [
      {
        score: 4,
        reason: 'Broad indemnification clause may expose client to significant liability',
      },
      {
        score: 2,
        reason: 'Standard limitation of liability clause limits provider exposure',
      },
    ],
    suggested_redactions: [],
    confidence_score: 0.95,
  }
}
