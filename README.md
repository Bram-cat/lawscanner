# LawScanner

A production-ready legal document scanner and summarizer built with Next.js 14. Scan, OCR, and analyze legal documents with AI-powered insights.

## Features

- **Document Capture**: Use Scanbot SDK for high-quality document scanning with auto-detection
- **OCR Processing**: Google Document AI or AWS Textract (configurable via environment)
- **AI Summarization**: Claude-powered analysis extracting parties, dates, obligations, and risks
- **Redaction UI**: Click-to-redact interface with AI-suggested sensitive data detection
- **GDPR Compliant**: On-device mode option to skip server uploads

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom color palette
- **OCR**: Google Document AI / AWS Textract
- **LLM**: Anthropic Claude
- **Scanner**: Scanbot Web SDK

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Floral White | `#fffcf2` | Background |
| Silver | `#ccc5b9` | Surface, borders |
| Charcoal Brown | `#403d39` | Secondary text |
| Carbon Black | `#252422` | Primary text |
| Spicy Paprika | `#eb5e28` | Primary accent |

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 3. Add API Keys

Edit `.env.local` and add your credentials:

#### Google Document AI (Default OCR Provider)

1. Create a Google Cloud project
2. Enable Document AI API
3. Create a processor (Document OCR or Form Parser)
4. Create a service account with Document AI User role
5. Download the service account key JSON

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
```

#### AWS Textract (Alternative OCR Provider)

```env
OCR_PROVIDER=aws
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

#### Anthropic Claude (Summarization)

Get your API key from [console.anthropic.com](https://console.anthropic.com/)

```env
ANTHROPIC_API_KEY=your-api-key
```

#### Scanbot SDK (Document Scanner)

Get your license key from [scanbot.io](https://scanbot.io/)

```env
NEXT_PUBLIC_SCANBOT_LICENSE_KEY=your-license-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing

### Run Unit Tests

```bash
npm test
```

### Run Pipeline Test

Tests the full OCR → Summarization pipeline:

```bash
# With mock LLM (no API key needed)
SKIP_LLM=true npm run test:pipeline

# Full pipeline (requires API keys)
npm run test:pipeline
```

### Test Without API Keys

Set `SKIP_LLM=true` to use mock responses for development:

```env
SKIP_LLM=true
```

## API Routes

### POST /api/ocr

Process a document with OCR.

**Request:**
```json
{
  "document": "base64-encoded-document",
  "filename": "document.pdf",
  "mimeType": "application/pdf"
}
```

**Response:**
```json
{
  "meta": {
    "filename": "document.pdf",
    "pages": 1,
    "provider": "google-document-ai",
    "processedAt": "2024-01-01T00:00:00.000Z"
  },
  "ocr": [{
    "page": 1,
    "text": "extracted text...",
    "blocks": [...],
    "entities": [...],
    "confidence": 0.95
  }]
}
```

### POST /api/summarize

Analyze OCR results with AI.

**Request:**
```json
{
  "ocr_result": { /* OCR response */ },
  "user_instructions": "Focus on payment terms"
}
```

**Response:**
```json
{
  "short_summary": "...",
  "parties": [...],
  "important_dates": [...],
  "obligations": [...],
  "payment_terms": "...",
  "termination_clauses": "...",
  "governing_law": "...",
  "risk_flags": [...],
  "suggested_redactions": [...],
  "confidence_score": 0.85
}
```

## Project Structure

```
lawscanner/
├── app/
│   ├── api/
│   │   ├── ocr/route.ts        # OCR processing endpoint
│   │   └── summarize/route.ts  # AI summarization endpoint
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main dashboard
├── components/
│   ├── ui/
│   │   ├── Button.tsx          # Button component
│   │   ├── Card.tsx            # Card component
│   │   └── index.ts            # UI exports
│   ├── CaptureScanner.tsx      # Scanbot integration
│   └── DocumentReview.tsx      # Summary & redaction UI
├── scripts/
│   └── test-pipeline.ts        # Integration test
├── __tests__/
│   └── utils/
│       ├── ocr-parser.test.ts  # OCR validation tests
│       └── llm-output.test.ts  # LLM output tests
├── .env.example                # Environment template
├── tailwind.config.ts          # Tailwind configuration
└── README.md
```

## GDPR & Privacy Compliance

### On-Device Mode

Enable "On-device only mode" in the UI to prevent document uploads to the server. In this mode:

- Documents are processed locally only
- Scanner captures stay on the device
- No data leaves the user's browser

### Data Retention

By default, LawScanner does not store any documents. Configure retention if needed:

```env
DOCUMENT_RETENTION_DAYS=0  # 0 = no retention
```

### Audit Logging

Enable audit logging for compliance:

```env
ENABLE_AUDIT_LOG=true
```

### User Rights

- **Right to Access**: Export all processed data via the Export button
- **Right to Erasure**: Documents are not stored by default
- **Data Portability**: Export in JSON format

## Security Considerations

1. **API Keys**: Never commit API keys. Use environment variables.
2. **Document Storage**: By default, documents are processed in memory only.
3. **Redaction**: Redacted PDFs flatten redactions permanently (black rectangles).
4. **TLS**: Always use HTTPS in production.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production

Ensure all required environment variables are set:

- `GOOGLE_CLOUD_PROJECT_ID` (or AWS credentials)
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SCANBOT_LICENSE_KEY`

## Troubleshooting

### OCR Returns Empty Text

1. Check file format (PDF, PNG, JPG, TIFF supported)
2. Verify image quality (minimum 300 DPI recommended)
3. Check OCR provider credentials

### Summarization Fails

1. Verify `ANTHROPIC_API_KEY` is set
2. Check API rate limits
3. Use `SKIP_LLM=true` for mock responses during development

### Scanner Not Loading

1. Verify Scanbot license key
2. Check browser camera permissions
3. Use HTTPS (required for camera access)

## Unit Test Suggestions

### OCR Parsing Tests

- Validate bounding box calculations
- Test entity extraction for different document types
- Verify confidence score normalization

### LLM Output Tests

- Validate JSON structure
- Test LOW_CONFIDENCE handling
- Verify risk score categorization
- Test redaction position validation

### Integration Tests

- End-to-end pipeline with sample documents
- Error handling for invalid inputs
- Rate limiting behavior

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT

## Support

For issues and feature requests, please open a GitHub issue.
