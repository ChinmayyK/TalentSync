import * as fs from 'fs';
import * as path from 'path';

export function loadSQL(filename: string): string {
  // Navigate from src/common to src/modules/reports/queries
  const p = path.join(
    __dirname,
    '..',
    'modules',
    'reports',
    'queries',
    filename,
  );
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (error) {
    throw new Error(`Could not load SQL file: ${filename} at path ${p}`);
  }
}

