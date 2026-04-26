/**
 * Boolean Search Parser
 *
 * Parses advanced search queries into Prisma-compatible filter objects.
 *
 * Supported syntax:
 * - AND: python AND java (both required)
 * - OR: react OR angular (either one)
 * - NOT: marketing NOT sales (exclude)
 * - Quotes: "senior developer" (exact phrase)
 * - Field: skills:python, name:"John Smith" (field-specific)
 * - Parentheses: (react OR angular) AND typescript (grouping)
 */

export interface ParsedQuery {
  type: 'AND' | 'OR' | 'NOT' | 'TERM' | 'PHRASE' | 'FIELD';
  value?: string;
  field?: string;
  left?: ParsedQuery;
  right?: ParsedQuery;
  children?: ParsedQuery[];
}

export interface PrismaFilter {
  AND?: PrismaFilter[];
  OR?: PrismaFilter[];
  NOT?: PrismaFilter | PrismaFilter[];
  [key: string]: any;
}

// Searchable fields in the Candidate model
const SEARCHABLE_FIELDS = [
  'name',
  'email',
  'phone',
  'roleTitle',
  'skills',
  'tags',
  'notes',
  'source',
];
const ARRAY_FIELDS = ['skills', 'tags'];

export class BooleanSearchParser {
  private tokens: string[] = [];
  private pos = 0;

  /**
   * Parse a search query string into a Prisma filter
   */
  parse(
    query: string,
    defaultFields: string[] = ['name', 'email', 'roleTitle'],
  ): PrismaFilter {
    if (!query || query.trim() === '') {
      return {};
    }

    // Tokenize the query
    this.tokens = this.tokenize(query);
    this.pos = 0;

    if (this.tokens.length === 0) {
      return {};
    }

    // Parse the expression tree
    const ast = this.parseExpression();

    // Convert AST to Prisma filter
    return this.astToPrisma(ast, defaultFields);
  }

  /**
   * Tokenize the query string
   */
  private tokenize(query: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < query.length) {
      const char = query[i];

      if (char === '"') {
        if (inQuotes) {
          // End of quoted string
          tokens.push(`"${current}"`);
          current = '';
          inQuotes = false;
        } else {
          // Start of quoted string
          if (current.trim()) {
            tokens.push(current.trim());
          }
          current = '';
          inQuotes = true;
        }
        i++;
        continue;
      }

      if (inQuotes) {
        current += char;
        i++;
        continue;
      }

      if (char === ' ' || char === '\t') {
        if (current.trim()) {
          tokens.push(current.trim());
        }
        current = '';
        i++;
        continue;
      }

      if (char === '(' || char === ')') {
        if (current.trim()) {
          tokens.push(current.trim());
        }
        tokens.push(char);
        current = '';
        i++;
        continue;
      }

      current += char;
      i++;
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  /**
   * Parse OR expression (lowest precedence)
   */
  private parseExpression(): ParsedQuery {
    let left = this.parseAndExpression();

    while (this.currentToken()?.toUpperCase() === 'OR') {
      this.advance(); // consume OR
      const right = this.parseAndExpression();
      left = { type: 'OR', left, right };
    }

    return left;
  }

  /**
   * Parse AND expression
   */
  private parseAndExpression(): ParsedQuery {
    let left = this.parseNotExpression();

    while (this.currentToken()?.toUpperCase() === 'AND') {
      this.advance(); // consume AND
      const right = this.parseNotExpression();
      left = { type: 'AND', left, right };
    }

    // Implicit AND: two terms next to each other without operator
    while (
      this.currentToken() &&
      !['AND', 'OR', 'NOT', ')'].includes(this.currentToken()!.toUpperCase())
    ) {
      const right = this.parseNotExpression();
      left = { type: 'AND', left, right };
    }

    return left;
  }

  /**
   * Parse NOT expression
   */
  private parseNotExpression(): ParsedQuery {
    if (this.currentToken()?.toUpperCase() === 'NOT') {
      this.advance(); // consume NOT
      const right = this.parsePrimary();
      return { type: 'NOT', right };
    }

    // Handle minus prefix as NOT
    if (
      this.currentToken()?.startsWith('-') &&
      this.currentToken()!.length > 1
    ) {
      const term = this.currentToken()!.substring(1);
      this.advance();
      return { type: 'NOT', right: this.parseTerm(term) };
    }

    return this.parsePrimary();
  }

  /**
   * Parse primary expression (terms, quotes, parentheses)
   */
  private parsePrimary(): ParsedQuery {
    const token = this.currentToken();

    if (!token) {
      return { type: 'TERM', value: '' };
    }

    // Parentheses grouping
    if (token === '(') {
      this.advance(); // consume (
      const expr = this.parseExpression();
      if (this.currentToken() === ')') {
        this.advance(); // consume )
      }
      return expr;
    }

    this.advance();
    return this.parseTerm(token);
  }

  /**
   * Parse a single term (may be field:value or quoted phrase)
   */
  private parseTerm(token: string): ParsedQuery {
    // Quoted phrase
    if (token.startsWith('"') && token.endsWith('"')) {
      const phrase = token.slice(1, -1);
      return { type: 'PHRASE', value: phrase };
    }

    // Field:value syntax
    if (token.includes(':')) {
      const colonIndex = token.indexOf(':');
      const field = token.substring(0, colonIndex).toLowerCase();
      let value = token.substring(colonIndex + 1);

      // Handle quoted value in field search
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
        return { type: 'FIELD', field, value };
      }

      return { type: 'FIELD', field, value };
    }

    // Regular term
    return { type: 'TERM', value: token };
  }

  private currentToken(): string | undefined {
    return this.tokens[this.pos];
  }

  private advance(): void {
    this.pos++;
  }

  /**
   * Convert parsed AST to Prisma filter
   */
  private astToPrisma(ast: ParsedQuery, defaultFields: string[]): PrismaFilter {
    switch (ast.type) {
      case 'AND':
        return {
          AND: [
            this.astToPrisma(ast.left!, defaultFields),
            this.astToPrisma(ast.right!, defaultFields),
          ].filter((f) => Object.keys(f).length > 0),
        };

      case 'OR':
        return {
          OR: [
            this.astToPrisma(ast.left!, defaultFields),
            this.astToPrisma(ast.right!, defaultFields),
          ].filter((f) => Object.keys(f).length > 0),
        };

      case 'NOT':
        return {
          NOT: this.astToPrisma(ast.right!, defaultFields),
        };

      case 'TERM':
      case 'PHRASE':
        // Search across all default fields
        return this.createMultiFieldFilter(
          ast.value || '',
          defaultFields,
          ast.type === 'PHRASE',
        );

      case 'FIELD':
        return this.createFieldFilter(ast.field || '', ast.value || '');

      default:
        return {};
    }
  }

  /**
   * Create filter for searching across multiple fields
   */
  private createMultiFieldFilter(
    value: string,
    fields: string[],
    exactMatch: boolean,
  ): PrismaFilter {
    if (!value) return {};

    const conditions: PrismaFilter[] = [];

    for (const field of fields) {
      if (ARRAY_FIELDS.includes(field)) {
        // Array fields use 'hasSome' for contains
        conditions.push({
          [field]: { hasSome: [value] },
        });
      } else {
        // String fields use 'contains' with case insensitivity
        if (exactMatch) {
          // For exact phrase, still use contains but the phrase must appear as-is
          conditions.push({
            [field]: { contains: value, mode: 'insensitive' },
          });
        } else {
          conditions.push({
            [field]: { contains: value, mode: 'insensitive' },
          });
        }
      }
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  /**
   * Create filter for a specific field
   */
  private createFieldFilter(field: string, value: string): PrismaFilter {
    // Validate field name
    if (!SEARCHABLE_FIELDS.includes(field)) {
      // If invalid field, treat as general term search
      return this.createMultiFieldFilter(
        `${field}:${value}`,
        ['name', 'email', 'roleTitle'],
        false,
      );
    }

    if (ARRAY_FIELDS.includes(field)) {
      return {
        [field]: { hasSome: [value] },
      };
    }

    return {
      [field]: { contains: value, mode: 'insensitive' },
    };
  }
}

// Export singleton instance for convenience
export const booleanSearchParser = new BooleanSearchParser();

/**
 * Quick helper function to parse a query
 */
export function parseSearchQuery(
  query: string,
  defaultFields?: string[],
): PrismaFilter {
  return booleanSearchParser.parse(query, defaultFields);
}
