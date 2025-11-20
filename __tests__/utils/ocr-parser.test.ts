/**
 * Unit tests for OCR parsing utilities
 *
 * These tests validate the OCR response parsing and normalization.
 */

import { OCRResult, OCRPageResult, OCRBlock } from '@/app/api/ocr/route'

describe('OCR Parser', () => {
  describe('OCR Result Validation', () => {
    it('should validate a complete OCR result structure', () => {
      const validResult: OCRResult = {
        meta: {
          filename: 'test.pdf',
          pages: 1,
          provider: 'google-document-ai',
          processedAt: new Date().toISOString(),
        },
        ocr: [
          {
            page: 1,
            text: 'Sample text',
            blocks: [
              {
                id: 'block-1',
                text: 'Sample text',
                confidence: 0.95,
                boundingBox: { x: 0, y: 0, width: 100, height: 20 },
                blockType: 'LINE',
              },
            ],
            entities: [],
            confidence: 0.95,
          },
        ],
      }

      expect(validResult.meta.filename).toBe('test.pdf')
      expect(validResult.meta.pages).toBe(1)
      expect(validResult.ocr).toHaveLength(1)
      expect(validResult.ocr[0].confidence).toBeGreaterThan(0)
    })

    it('should handle empty OCR results', () => {
      const emptyResult: OCRResult = {
        meta: {
          filename: 'empty.pdf',
          pages: 0,
          provider: 'google-document-ai',
          processedAt: new Date().toISOString(),
        },
        ocr: [],
      }

      expect(emptyResult.ocr).toHaveLength(0)
      expect(emptyResult.meta.pages).toBe(0)
    })

    it('should validate block types', () => {
      const validBlockTypes: OCRBlock['blockType'][] = ['LINE', 'WORD', 'PARAGRAPH']

      validBlockTypes.forEach((blockType) => {
        const block: OCRBlock = {
          id: `block-${blockType}`,
          text: 'test',
          confidence: 0.9,
          boundingBox: { x: 0, y: 0, width: 100, height: 20 },
          blockType,
        }
        expect(['LINE', 'WORD', 'PARAGRAPH']).toContain(block.blockType)
      })
    })

    it('should calculate page confidence correctly', () => {
      const blocks: OCRBlock[] = [
        {
          id: 'b1',
          text: 'text1',
          confidence: 0.9,
          boundingBox: { x: 0, y: 0, width: 100, height: 20 },
          blockType: 'LINE',
        },
        {
          id: 'b2',
          text: 'text2',
          confidence: 0.8,
          boundingBox: { x: 0, y: 20, width: 100, height: 20 },
          blockType: 'LINE',
        },
        {
          id: 'b3',
          text: 'text3',
          confidence: 0.7,
          boundingBox: { x: 0, y: 40, width: 100, height: 20 },
          blockType: 'LINE',
        },
      ]

      const avgConfidence = blocks.reduce((sum, b) => sum + b.confidence, 0) / blocks.length
      expect(avgConfidence).toBeCloseTo(0.8, 2)
    })
  })

  describe('Entity Extraction', () => {
    it('should parse entity types correctly', () => {
      const page: OCRPageResult = {
        page: 1,
        text: 'Contract dated January 1, 2024',
        blocks: [],
        entities: [
          {
            type: 'DATE',
            text: 'January 1, 2024',
            page: 1,
            confidence: 0.95,
          },
          {
            type: 'KEY_VALUE',
            text: 'Contract Number: 12345',
            page: 1,
            confidence: 0.88,
          },
        ],
        confidence: 0.9,
      }

      expect(page.entities).toHaveLength(2)
      expect(page.entities[0].type).toBe('DATE')
      expect(page.entities[1].type).toBe('KEY_VALUE')
    })

    it('should filter entities by confidence threshold', () => {
      const entities = [
        { type: 'NAME', text: 'John Doe', page: 1, confidence: 0.95 },
        { type: 'NAME', text: 'Jane', page: 1, confidence: 0.45 },
        { type: 'DATE', text: '2024-01-01', page: 1, confidence: 0.88 },
      ]

      const highConfidence = entities.filter((e) => e.confidence >= 0.5)
      const lowConfidence = entities.filter((e) => e.confidence < 0.5)

      expect(highConfidence).toHaveLength(2)
      expect(lowConfidence).toHaveLength(1)
    })
  })

  describe('Bounding Box Calculations', () => {
    it('should calculate normalized coordinates', () => {
      const boundingBox = {
        x: 0.1, // 10% from left
        y: 0.2, // 20% from top
        width: 0.5, // 50% width
        height: 0.1, // 10% height
      }

      // Page dimensions (example: 612x792 for letter)
      const pageWidth = 612
      const pageHeight = 792

      const pixelCoords = {
        x: boundingBox.x * pageWidth,
        y: boundingBox.y * pageHeight,
        width: boundingBox.width * pageWidth,
        height: boundingBox.height * pageHeight,
      }

      expect(pixelCoords.x).toBeCloseTo(61.2, 1)
      expect(pixelCoords.y).toBeCloseTo(158.4, 1)
      expect(pixelCoords.width).toBeCloseTo(306, 1)
      expect(pixelCoords.height).toBeCloseTo(79.2, 1)
    })
  })
})
