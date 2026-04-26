/**
 * PDF to Image Converter
 *
 * Converts PDF pages to images for OCR processing.
 * Used as a fallback when native PDF text extraction yields minimal content.
 */

import type { Options as PdfOptions } from 'pdf-to-img';

/**
 * Options for PDF to image conversion
 */
export interface PdfToImageOptions {
  /** Maximum number of pages to convert (default: 5) */
  maxPages?: number;
  /** Scale factor for rendering (default: 2.0 for ~150 DPI) */
  scale?: number;
}

/**
 * Convert PDF buffer to an array of PNG image buffers
 * @param pdfBuffer The PDF file as a buffer
 * @param options Conversion options
 * @returns Array of PNG image buffers, one per page
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  options: PdfToImageOptions = {},
): Promise<Buffer[]> {
  const { maxPages = 5, scale = 2.0 } = options;
  const images: Buffer[] = [];

  try {
    // Dynamically import pdf-to-img (ESM module)
    const { pdf } = await import('pdf-to-img');

    // Configure conversion options
    const convertOptions: PdfOptions = {
      scale, // Higher scale = better quality for OCR
    };

    // Convert PDF pages to images
    const doc = await pdf(pdfBuffer, convertOptions);

    let pageCount = 0;
    for await (const page of doc) {
      if (pageCount >= maxPages) break;

      // page is a Buffer (PNG)
      images.push(page);
      pageCount++;
    }

    console.log(`[PDF-to-Image] Converted ${images.length} pages from PDF`);
    return images;
  } catch (error) {
    console.error('[PDF-to-Image] Conversion failed:', error);
    return [];
  }
}

/**
 * Check if a PDF appears to be scanned (image-based)
 * Heuristic: If text extraction yields very little text relative to file size
 */
export function isProbablyScannedPdf(
  textLength: number,
  fileSizeBytes: number,
): boolean {
  // A typical text PDF has roughly 2000-3000 characters per page
  // A scanned PDF has almost no extractable text
  // If text/size ratio is very low, it's likely scanned
  const textRatio = textLength / fileSizeBytes;

  // Threshold: if less than 0.01 characters per byte, likely scanned
  // (A 1MB PDF with <10KB of text is suspicious)
  return textRatio < 0.01 && textLength < 100;
}
