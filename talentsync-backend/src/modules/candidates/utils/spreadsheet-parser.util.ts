import * as XLSX from 'xlsx';

export interface ParsedRow {
  name: string;
  email?: string;
  phone?: string;
  roleTitle?: string;
  source?: string;
  stage?: string;
  tags?: string;
  notes?: string;
  resumeUrl?: string;
}

// Limits to prevent DoS
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 10000;

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse CSV or XLSX buffer into candidate rows
 */
export function parseSpreadsheet(
  buffer: Buffer,
  mimeType: string,
): ParsedRow[] {
  // Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('No sheets found in file');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: '',
  });

  if (rawData.length === 0) {
    throw new Error('File contains no data rows');
  }

  // Enforce row limit
  if (rawData.length > MAX_ROWS) {
    throw new Error(`Too many rows. Maximum is ${MAX_ROWS} rows`);
  }

  // Normalize column headers (case-insensitive mapping)
  const rows: ParsedRow[] = rawData.map((row) => {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(row)) {
      const lowerKey = key.toLowerCase().trim();
      normalized[lowerKey] = String(value || '').trim();
    }

    return {
      name:
        normalized['name'] ||
        normalized['full name'] ||
        normalized['candidate name'] ||
        '',
      email: normalized['email'] || normalized['email address'] || undefined,
      phone:
        normalized['phone'] ||
        normalized['phone number'] ||
        normalized['mobile'] ||
        undefined,
      roleTitle:
        normalized['roletitle'] ||
        normalized['role'] ||
        normalized['position'] ||
        normalized['job title'] ||
        undefined,
      source: normalized['source'] || undefined,
      stage: normalized['stage'] || normalized['status'] || undefined,
      tags: normalized['tags'] || undefined,
      notes: normalized['notes'] || normalized['comments'] || undefined,
      resumeUrl:
        normalized['resumeurl'] ||
        normalized['resume url'] ||
        normalized['resume'] ||
        undefined,
    };
  });

  // Filter out rows without names and validate emails
  return rows
    .filter((row) => row.name && row.name.length > 0)
    .map((row) => ({
      ...row,
      // Validate email format - set to undefined if invalid
      email: row.email && EMAIL_REGEX.test(row.email) ? row.email : undefined,
    }));
}

/**
 * Validate that the file is a supported spreadsheet format
 */
export function isSupportedSpreadsheet(mimeType: string): boolean {
  const supported = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
  ];
  return supported.includes(mimeType);
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'text/csv': 'csv',
    'application/csv': 'csv',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  };
  return map[mimeType] || 'unknown';
}
