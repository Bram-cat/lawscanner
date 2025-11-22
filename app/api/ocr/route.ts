import { NextRequest, NextResponse } from 'next/server'

// Types for OCR response
export interface OCRBlock {
  id: string
  text: string
  confidence: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  blockType: 'LINE' | 'WORD' | 'PARAGRAPH'
}

export interface OCREntity {
  type: string
  text: string
  page: number
  confidence: number
  mentionText?: string | null
}

export interface OCRPageResult {
  page: number
  text: string
  blocks: OCRBlock[]
  entities: OCREntity[]
  confidence: number
}

export interface OCRResult {
  meta: {
    filename: string
    pages: number
    provider: string
    processedAt: string
  }
  ocr: OCRPageResult[]
}

// Get OCR provider from environment
const OCR_PROVIDER = process.env.OCR_PROVIDER || 'google' // 'google' or 'aws'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { document, filename, mimeType } = body

    if (!document) {
      return NextResponse.json(
        { error: 'No document provided' },
        { status: 400 }
      )
    }

    // Validate base64
    let documentBuffer: Buffer
    try {
      documentBuffer = Buffer.from(document, 'base64')
    } catch {
      return NextResponse.json(
        { error: 'Invalid base64 document' },
        { status: 400 }
      )
    }

    let result: OCRResult

    if (OCR_PROVIDER === 'aws') {
      result = await processWithAWSTextract(
        documentBuffer,
        filename || 'document.pdf',
        mimeType || 'application/pdf'
      )
    } else {
      result = await processWithGoogleDocumentAI(
        documentBuffer,
        filename || 'document.pdf',
        mimeType || 'application/pdf'
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      {
        error: 'OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Process document using Google Document AI
 */
async function processWithGoogleDocumentAI(
  documentBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<OCRResult> {
  // TODO: Add your Google Cloud credentials
  // Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key file path
  // Or configure credentials programmatically below

  const { DocumentProcessorServiceClient } = await import(
    '@google-cloud/documentai'
  )

  // Initialize the client
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const location = process.env.GOOGLE_CLOUD_LOCATION
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID

  // Validate all required environment variables
  if (!projectId || !location || !processorId) {
    throw new Error('Missing Google Cloud configuration. Please set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_LOCATION, and GOOGLE_DOCUMENT_AI_PROCESSOR_ID in your environment variables.')
  }

  // Use environment variables for credentials (works in Vercel)
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google Cloud credentials. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in your environment variables.')
  }

  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }

  const client = new DocumentProcessorServiceClient({
    credentials,
  })

  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`

  const request = {
    name,
    rawDocument: {
      content: documentBuffer,
      mimeType,
    },
  }

  const [response] = await client.processDocument(request)
  const { document } = response

  if (!document) {
    throw new Error('No document returned from Document AI')
  }

  // Parse Document AI response
  const pages: OCRPageResult[] = []
  const pageCount = document.pages?.length || 1

  for (let i = 0; i < pageCount; i++) {
    const page = document.pages?.[i]
    const blocks: OCRBlock[] = []
    const entities: OCREntity[] = []
    let pageText = ''
    let totalConfidence = 0
    let confidenceCount = 0

    // Extract text blocks
    if (page?.blocks) {
      for (const block of page.blocks) {
        if (!block.layout) continue

        const blockText = extractTextFromLayout(block.layout, document.text || '')
        const confidence = block.layout.confidence || 0

        blocks.push({
          id: `block-${i}-${blocks.length}`,
          text: blockText,
          confidence,
          boundingBox: extractBoundingBox(block.layout.boundingPoly),
          blockType: 'PARAGRAPH',
        })

        pageText += blockText + '\n'
        totalConfidence += confidence
        confidenceCount++
      }
    }

    // Extract lines if no blocks
    if (blocks.length === 0 && page?.lines) {
      for (const line of page.lines) {
        if (!line.layout) continue

        const lineText = extractTextFromLayout(line.layout, document.text || '')
        const confidence = line.layout.confidence || 0

        blocks.push({
          id: `line-${i}-${blocks.length}`,
          text: lineText,
          confidence,
          boundingBox: extractBoundingBox(line.layout.boundingPoly),
          blockType: 'LINE',
        })

        pageText += lineText + '\n'
        totalConfidence += confidence
        confidenceCount++
      }
    }

    // Extract entities
    if (document.entities) {
      for (const entity of document.entities) {
        // Check if entity is on this page
        const entityPage = entity.pageAnchor?.pageRefs?.[0]?.page
        if (entityPage === undefined || Number(entityPage) === i) {
          entities.push({
            type: entity.type || 'UNKNOWN',
            text: entity.mentionText || entity.normalizedValue?.text || '',
            page: i + 1,
            confidence: entity.confidence || 0,
            mentionText: entity.mentionText,
          })
        }
      }
    }

    pages.push({
      page: i + 1,
      text: pageText.trim(),
      blocks,
      entities,
      confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
    })
  }

  return {
    meta: {
      filename,
      pages: pageCount,
      provider: 'google-document-ai',
      processedAt: new Date().toISOString(),
    },
    ocr: pages,
  }
}

/**
 * Process document using AWS Textract
 */
async function processWithAWSTextract(
  documentBuffer: Buffer,
  filename: string,
  _mimeType: string
): Promise<OCRResult> {
  // TODO: Add your AWS credentials
  // Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables
  // Or configure credentials programmatically below

  const { TextractClient, AnalyzeDocumentCommand } = await import(
    '@aws-sdk/client-textract'
  )

  const client = new TextractClient({
    region: process.env.AWS_REGION || 'us-east-1',
    // TODO: Uncomment and add your credentials if not using environment variables
    // credentials: {
    //   accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    // },
  })

  // Note: For multi-page PDFs, you'll need to use StartDocumentAnalysis + GetDocumentAnalysis
  // This example uses AnalyzeDocument which works for single-page documents
  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: documentBuffer,
    },
    FeatureTypes: ['TABLES', 'FORMS'],
  })

  const response = await client.send(command)

  if (!response.Blocks) {
    throw new Error('No blocks returned from Textract')
  }

  // Parse Textract response
  const blocks: OCRBlock[] = []
  const entities: OCREntity[] = []
  let pageText = ''
  let totalConfidence = 0
  let confidenceCount = 0

  // Build block map for relationship resolution
  const blockMap = new Map<string, typeof response.Blocks[0]>()
  for (const block of response.Blocks) {
    if (block.Id) {
      blockMap.set(block.Id, block)
    }
  }

  // Extract LINE blocks
  for (const block of response.Blocks) {
    if (block.BlockType === 'LINE' && block.Text) {
      const confidence = block.Confidence ? block.Confidence / 100 : 0

      blocks.push({
        id: block.Id || `block-${blocks.length}`,
        text: block.Text,
        confidence,
        boundingBox: {
          x: block.Geometry?.BoundingBox?.Left || 0,
          y: block.Geometry?.BoundingBox?.Top || 0,
          width: block.Geometry?.BoundingBox?.Width || 0,
          height: block.Geometry?.BoundingBox?.Height || 0,
        },
        blockType: 'LINE',
      })

      pageText += block.Text + '\n'
      totalConfidence += confidence
      confidenceCount++
    }

    // Extract key-value pairs as entities
    if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
      const keyText = getTextFromRelationships(block, blockMap, 'CHILD')
      const valueBlock = getValueBlock(block, blockMap)
      const valueText = valueBlock
        ? getTextFromRelationships(valueBlock, blockMap, 'CHILD')
        : ''

      if (keyText) {
        entities.push({
          type: 'KEY_VALUE',
          text: `${keyText}: ${valueText}`,
          page: 1,
          confidence: block.Confidence ? block.Confidence / 100 : 0,
        })
      }
    }
  }

  const pageResult: OCRPageResult = {
    page: 1,
    text: pageText.trim(),
    blocks,
    entities,
    confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
  }

  return {
    meta: {
      filename,
      pages: 1, // Single page for AnalyzeDocument
      provider: 'aws-textract',
      processedAt: new Date().toISOString(),
    },
    ocr: [pageResult],
  }
}

// Helper functions for Google Document AI
function extractTextFromLayout(
  layout: any,
  fullText: string
): string {
  if (!layout?.textAnchor?.textSegments) return ''

  let text = ''
  for (const segment of layout.textAnchor.textSegments) {
    const startIndex = Number(segment.startIndex || 0)
    const endIndex = Number(segment.endIndex || 0)
    text += fullText.substring(startIndex, endIndex)
  }
  return text.trim()
}

function extractBoundingBox(
  boundingPoly: any
): { x: number; y: number; width: number; height: number } {
  if (!boundingPoly?.normalizedVertices || boundingPoly.normalizedVertices.length < 4) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const vertices = boundingPoly.normalizedVertices
  const x = vertices[0]?.x || 0
  const y = vertices[0]?.y || 0
  const width = (vertices[1]?.x || 0) - x
  const height = (vertices[2]?.y || 0) - y

  return { x, y, width, height }
}

// Helper functions for AWS Textract
function getTextFromRelationships(
  block: { Relationships?: Array<{ Type?: string; Ids?: string[] }> },
  blockMap: Map<string, { Text?: string; BlockType?: string }>,
  relationshipType: string
): string {
  let text = ''
  const relationships = block.Relationships || []

  for (const relationship of relationships) {
    if (relationship.Type === relationshipType && relationship.Ids) {
      for (const id of relationship.Ids) {
        const relatedBlock = blockMap.get(id)
        if (relatedBlock?.BlockType === 'WORD' && relatedBlock.Text) {
          text += relatedBlock.Text + ' '
        }
      }
    }
  }

  return text.trim()
}

function getValueBlock(
  keyBlock: { Relationships?: Array<{ Type?: string; Ids?: string[] }> },
  blockMap: Map<string, { BlockType?: string; EntityTypes?: string[] }>
): { Relationships?: Array<{ Type?: string; Ids?: string[] }> } | undefined {
  const relationships = keyBlock.Relationships || []

  for (const relationship of relationships) {
    if (relationship.Type === 'VALUE' && relationship.Ids) {
      for (const id of relationship.Ids) {
        const valueBlock = blockMap.get(id)
        if (
          valueBlock?.BlockType === 'KEY_VALUE_SET' &&
          valueBlock.EntityTypes?.includes('VALUE')
        ) {
          return valueBlock as { Relationships?: Array<{ Type?: string; Ids?: string[] }> }
        }
      }
    }
  }

  return undefined
}
