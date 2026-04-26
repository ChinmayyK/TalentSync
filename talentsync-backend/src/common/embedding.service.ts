import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI embedding service initialized');
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not set - semantic search will be unavailable',
      );
    }
  }

  /**
   * Check if embeddings are available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) {
      return null;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Limit to 8k chars
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error}`);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.openai || texts.length === 0) {
      return texts.map(() => null);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts.map((t) => t.slice(0, 8000)),
      });

      return response.data.map((d) => d.embedding);
    } catch (error) {
      this.logger.error(`Failed to generate batch embeddings: ${error}`);
      return texts.map(() => null);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Create a searchable text from candidate data
   */
  createCandidateSearchText(candidate: {
    name?: string;
    roleTitle?: string;
    skills?: string[];
    notes?: string;
    source?: string;
  }): string {
    const parts = [
      candidate.name,
      candidate.roleTitle,
      candidate.skills?.join(' '),
      candidate.notes?.slice(0, 2000),
      candidate.source,
    ].filter(Boolean);

    return parts.join(' ');
  }
}
