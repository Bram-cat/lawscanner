import '@testing-library/jest-dom'

// Mock fetch for API tests
global.fetch = jest.fn()

// Mock environment variables
process.env.OCR_PROVIDER = 'google'
process.env.SKIP_LLM = 'true'
