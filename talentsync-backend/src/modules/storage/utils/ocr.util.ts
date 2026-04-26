/**
 * Tesseract OCR Utility
 *
 * Extracts text from images using Tesseract.js OCR engine.
 * Supports preprocessing for better accuracy on scanned documents.
 */

import Tesseract, { Worker, createWorker } from 'tesseract.js';
import sharp from 'sharp';

// Worker pool for better performance
let workerPool: Worker[] = [];
let workerIndex = 0;
const MAX_WORKERS = 2;
const WORKER_INIT_PROMISE: Map<number, Promise<Worker>> = new Map();

/**
 * OCR Result with confidence score
 */
export interface OCRResult {
  text: string;
  confidence: number;
  processingTimeMs: number;
}

/**
 * Initialize a Tesseract worker with English language
 */
async function initializeWorker(): Promise<Worker> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Tesseract] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`,
        );
      }
    },
  });
  return worker;
}

/**
 * Get an available worker from the pool
 */
async function getWorker(): Promise<Worker> {
  // If pool not full, create new worker
  if (workerPool.length < MAX_WORKERS) {
    const index = workerPool.length;

    // Check if already initializing
    if (!WORKER_INIT_PROMISE.has(index)) {
      WORKER_INIT_PROMISE.set(index, initializeWorker());
    }

    const worker = await WORKER_INIT_PROMISE.get(index)!;
    if (workerPool.length <= index) {
      workerPool.push(worker);
    }
    return worker;
  }

  // Round-robin through existing workers
  const worker = workerPool[workerIndex % workerPool.length];
  workerIndex++;
  return worker;
}

/**
 * Preprocess image for better OCR accuracy
 * - Convert to grayscale
 * - Increase contrast
 * - Resize if too small
 * - Apply sharpening
 */
async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(buffer).metadata();

    let pipeline = sharp(buffer)
      .grayscale()
      .normalize() // Enhance contrast
      .sharpen({ sigma: 1.5 });

    // If image is small, upscale for better OCR
    if (metadata.width && metadata.width < 1000) {
      pipeline = pipeline.resize({
        width: Math.min(metadata.width * 2, 3000),
        fit: 'inside',
      });
    }

    // Convert to PNG for consistent format
    return await pipeline.png().toBuffer();
  } catch (error) {
    console.error('[OCR] Image preprocessing failed:', error);
    // Return original buffer if preprocessing fails
    return buffer;
  }
}

/**
 * Run OCR on an image buffer
 * @param buffer Image buffer (PNG, JPEG, TIFF, etc.)
 * @param preprocess Whether to preprocess the image (default: true)
 */
export async function runOCR(
  buffer: Buffer,
  preprocess = true,
): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // Preprocess for better accuracy
    const processedBuffer = preprocess ? await preprocessImage(buffer) : buffer;

    // Get worker from pool
    const worker = await getWorker();

    // Run OCR
    const result = await worker.recognize(processedBuffer);

    const processingTimeMs = Date.now() - startTime;

    return {
      text: result.data.text || '',
      confidence: result.data.confidence || 0,
      processingTimeMs,
    };
  } catch (error) {
    console.error('[OCR] Text extraction failed:', error);
    return {
      text: '',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Run OCR on multiple image buffers and concatenate results
 */
export async function runOCRBatch(buffers: Buffer[]): Promise<OCRResult> {
  const startTime = Date.now();
  const results: string[] = [];
  let totalConfidence = 0;

  for (const buffer of buffers) {
    const result = await runOCR(buffer);
    if (result.text.trim()) {
      results.push(result.text);
      totalConfidence += result.confidence;
    }
  }

  return {
    text: results.join('\n\n--- Page Break ---\n\n'),
    confidence: results.length > 0 ? totalConfidence / results.length : 0,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Check if the MIME type is an image type
 */
export function isImageMimeType(mimeType: string): boolean {
  const imageTypes = [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'image/gif',
    'image/webp',
  ];
  return imageTypes.includes(mimeType.toLowerCase());
}

/**
 * Terminate all workers in the pool (cleanup)
 */
export async function terminateWorkers(): Promise<void> {
  for (const worker of workerPool) {
    await worker.terminate();
  }
  workerPool = [];
  workerIndex = 0;
  WORKER_INIT_PROMISE.clear();
}
