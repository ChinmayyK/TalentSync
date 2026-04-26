import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EmbeddingService } from '../../../common/embedding.service';

export interface SemanticSearchResult {
  id: string;
  name: string;
  email: string | null;
  roleTitle: string | null;
  stage: string;
  score: number;
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Check if semantic search is available
   */
  isAvailable(): boolean {
    return this.embeddingService.isAvailable();
  }

  /**
   * Perform semantic search on candidates
   */
  async search(
    tenantId: string,
    query: string,
    limit: number = 20,
  ): Promise<SemanticSearchResult[]> {
    if (!this.embeddingService.isAvailable()) {
      this.logger.warn('Semantic search unavailable - OPENAI_API_KEY not set');
      return [];
    }

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    if (!queryEmbedding) {
      return [];
    }

    // Fetch candidates with embeddings
    const candidates = await this.prisma.candidate.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleTitle: true,
        stage: true,
        tags: true,
        notes: true,
        source: true,
      },
      take: 500, // Limit to first 500 for performance
    });

    // Calculate similarity scores
    const results: SemanticSearchResult[] = [];

    for (const candidate of candidates) {
      // Create searchable text
      const candidateText = this.embeddingService.createCandidateSearchText({
        name: candidate.name,
        roleTitle: candidate.roleTitle || undefined,
        skills: candidate.tags,
        notes: candidate.notes || undefined,
        source: candidate.source || undefined,
      });

      // Generate embedding for candidate
      const candidateEmbedding =
        await this.embeddingService.generateEmbedding(candidateText);
      if (!candidateEmbedding) continue;

      // Calculate similarity
      const score = this.embeddingService.cosineSimilarity(
        queryEmbedding,
        candidateEmbedding,
      );

      if (score > 0.3) {
        // Threshold for relevance
        results.push({
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          roleTitle: candidate.roleTitle,
          stage: candidate.stage,
          score: Math.round(score * 100) / 100,
        });
      }
    }

    // Sort by score and return top results
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Faster semantic search using cached embeddings (future enhancement)
   * For now, generates embeddings on-the-fly
   */
  async searchFast(
    tenantId: string,
    query: string,
    limit: number = 20,
  ): Promise<SemanticSearchResult[]> {
    // For production, we would:
    // 1. Store embeddings in a vector database (Pinecone, Weaviate, pgvector)
    // 2. Query the vector DB directly
    // 3. Return matched candidates

    // For now, fall back to regular search
    return this.search(tenantId, query, limit);
  }
}
