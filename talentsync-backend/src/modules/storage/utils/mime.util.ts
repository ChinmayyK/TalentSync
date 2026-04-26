import * as mime from 'mime-types';

const ALLOWED_MIME_TYPES = {
  candidate: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ],
  interview: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ],
  user: ['image/png', 'image/jpeg', 'image/jpg'],
};

export function getMimeType(filename: string): string {
  return mime.lookup(filename) || 'application/octet-stream';
}

export function getExtension(mimeType: string): string {
  return mime.extension(mimeType) || '';
}

export function isAllowedMimeType(
  mimeType: string,
  linkedType?: string,
): boolean {
  if (!linkedType) return true; // No restriction if not linked

  const allowed =
    ALLOWED_MIME_TYPES[linkedType as keyof typeof ALLOWED_MIME_TYPES];
  if (!allowed) return true;

  return allowed.includes(mimeType);
}

export function validateFileSize(
  size: number,
  maxSizeMB: number = 100,
): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return size <= maxBytes;
}
