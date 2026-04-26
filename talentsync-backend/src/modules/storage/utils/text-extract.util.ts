/**
 * Text Extraction Utility
 *
 * Extracts text from various document formats:
 * - PDF (native text layer, with OCR fallback)
 * - DOCX (Microsoft Word)
 * - Plain text
 * - Images (via OCR)
 */

const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import { runOCR, runOCRBatch, isImageMimeType, OCRResult } from './ocr.util';
import { convertPdfToImages, isProbablyScannedPdf } from './pdf-image.util';

// Minimum text length to consider PDF as having extractable text
const MIN_TEXT_LENGTH = 50;

/**
 * Extraction result with metadata
 */
export interface ExtractionResult {
  text: string;
  method: 'native' | 'ocr' | 'fallback';
  confidence?: number;
  processingTimeMs?: number;
}

/**
 * Extract text from a document buffer
 * @param buffer The document as a buffer
 * @param mimeType The MIME type of the document
 * @returns Extracted text
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const result = await extractTextWithMetadata(buffer, mimeType);
  return result.text;
}

/**
 * Extract text with detailed metadata about extraction method
 */
export async function extractTextWithMetadata(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  const startTime = Date.now();

  // PDF extraction with OCR fallback
  if (mimeType === 'application/pdf') {
    return await extractFromPdf(buffer, startTime);
  }

  // DOCX extraction
  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value,
        method: 'native',
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[Text Extract] DOCX extraction failed:', error);
      return {
        text: '',
        method: 'fallback',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  // Plain text
  if (mimeType === 'text/plain') {
    return {
      text: buffer.toString('utf-8'),
      method: 'native',
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Image - direct OCR
  if (isImageMimeType(mimeType)) {
    const ocrResult = await runOCR(buffer);
    return {
      text: ocrResult.text,
      method: 'ocr',
      confidence: ocrResult.confidence,
      processingTimeMs: ocrResult.processingTimeMs,
    };
  }

  // Unsupported format
  console.warn(`[Text Extract] Unsupported MIME type: ${mimeType}`);
  return {
    text: '',
    method: 'fallback',
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Extract text from PDF with OCR fallback for scanned documents
 */
async function extractFromPdf(
  buffer: Buffer,
  startTime: number,
): Promise<ExtractionResult> {
  try {
    // First, try native PDF text extraction
    const data = await pdfParse(buffer);
    const nativeText = (data.text || '').trim();

    // Check if we got enough text
    if (nativeText.length >= MIN_TEXT_LENGTH) {
      console.log(
        `[Text Extract] PDF native extraction: ${nativeText.length} chars`,
      );
      return {
        text: nativeText,
        method: 'native',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Check if this looks like a scanned PDF
    if (isProbablyScannedPdf(nativeText.length, buffer.length)) {
      console.log('[Text Extract] PDF appears scanned, using OCR fallback');
      return await extractFromPdfWithOCR(buffer, startTime);
    }

    // PDF has some text but not much - return what we have
    if (nativeText.length > 0) {
      console.log(
        `[Text Extract] PDF partial extraction: ${nativeText.length} chars`,
      );
      return {
        text: nativeText,
        method: 'native',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // No text at all - try OCR
    console.log('[Text Extract] PDF has no text layer, using OCR');
    return await extractFromPdfWithOCR(buffer, startTime);
  } catch (error) {
    console.error('[Text Extract] PDF parsing failed, trying OCR:', error);
    return await extractFromPdfWithOCR(buffer, startTime);
  }
}

/**
 * Extract text from PDF using OCR (convert pages to images first)
 */
async function extractFromPdfWithOCR(
  buffer: Buffer,
  startTime: number,
): Promise<ExtractionResult> {
  try {
    // Convert PDF pages to images (max 5 pages, 2x scale for ~150 DPI)
    const images = await convertPdfToImages(buffer, {
      maxPages: 5,
      scale: 2.0,
    });

    if (images.length === 0) {
      console.warn('[Text Extract] PDF-to-image conversion yielded no pages');
      return {
        text: '',
        method: 'fallback',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Run OCR on all images
    const ocrResult = await runOCRBatch(images);

    console.log(
      `[Text Extract] OCR complete: ${ocrResult.text.length} chars, ` +
        `${ocrResult.confidence.toFixed(1)}% confidence, ` +
        `${ocrResult.processingTimeMs}ms`,
    );

    return {
      text: ocrResult.text,
      method: 'ocr',
      confidence: ocrResult.confidence,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[Text Extract] OCR extraction failed:', error);
    return {
      text: '',
      method: 'fallback',
      processingTimeMs: Date.now() - startTime,
    };
  }
}
