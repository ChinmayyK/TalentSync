import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface SearchSuggestion {
  text: string;
  category: 'candidate' | 'skill' | 'role' | 'recent' | 'field';
  count?: number;
}

@Injectable()
export class SearchSuggestionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get search suggestions based on query prefix
   */
  async getSuggestions(
    tenantId: string,
    query: string,
    limit: number = 10,
  ): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions: SearchSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Check if user is typing a field prefix
    if (lowerQuery.includes(':')) {
      const [field, value] = lowerQuery.split(':');
      return this.getFieldSuggestions(tenantId, field, value || '', limit);
    }

    // Parallel fetch from multiple sources
    const [candidates, skills, roles] = await Promise.all([
      this.getCandidateNameSuggestions(tenantId, query, Math.ceil(limit / 3)),
      this.getSkillSuggestions(tenantId, query, Math.ceil(limit / 3)),
      this.getRoleSuggestions(tenantId, query, Math.ceil(limit / 3)),
    ]);

    suggestions.push(...candidates);
    suggestions.push(...skills);
    suggestions.push(...roles);

    // Sort by relevance (exact prefix matches first)
    suggestions.sort((a, b) => {
      const aStartsWith = a.text.toLowerCase().startsWith(lowerQuery);
      const bStartsWith = b.text.toLowerCase().startsWith(lowerQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return (b.count || 0) - (a.count || 0);
    });

    return suggestions.slice(0, limit);
  }

  /**
   * Get field-specific suggestions (e.g., skills:python)
   */
  private async getFieldSuggestions(
    tenantId: string,
    field: string,
    value: string,
    limit: number,
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // Add field hint suggestions
    const fieldHints = [
      { field: 'name', hint: 'name:' },
      { field: 'email', hint: 'email:' },
      { field: 'skills', hint: 'skills:' },
      { field: 'phone', hint: 'phone:' },
      { field: 'role', hint: 'roleTitle:' },
      { field: 'source', hint: 'source:' },
    ];

    // If no value yet, suggest the field completion
    if (!value) {
      return fieldHints
        .filter((h) => h.field.startsWith(field.toLowerCase()))
        .map((h) => ({
          text: h.hint,
          category: 'field' as const,
        }));
    }

    // Get values for the specific field
    switch (field.toLowerCase()) {
      case 'skills':
      case 'skill':
        return this.getSkillSuggestions(tenantId, value, limit);
      case 'role':
      case 'roletitle':
        return this.getRoleSuggestions(tenantId, value, limit);
      case 'source':
        return this.getSourceSuggestions(tenantId, value, limit);
      default:
        return [];
    }
  }

  /**
   * Get candidate name suggestions
   */
  private async getCandidateNameSuggestions(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchSuggestion[]> {
    const candidates = await this.prisma.candidate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        name: { contains: query, mode: 'insensitive' },
      },
      select: { name: true },
      take: limit,
      distinct: ['name'],
    });

    return candidates.map((c) => ({
      text: c.name,
      category: 'candidate' as const,
    }));
  }

  /**
   * Get skill suggestions from candidate tags
   */
  private async getSkillSuggestions(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchSuggestion[]> {
    // Get all unique skills from candidates
    const candidates = await this.prisma.candidate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        tags: { isEmpty: false },
      },
      select: { tags: true },
    });

    // Flatten and count skills
    const skillCounts = new Map<string, number>();
    for (const c of candidates) {
      for (const skill of c.tags) {
        if (skill.toLowerCase().includes(query.toLowerCase())) {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        }
      }
    }

    // Sort by count and return
    return Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([text, count]) => ({
        text: `skills:${text}`,
        category: 'skill' as const,
        count,
      }));
  }

  /**
   * Get role/title suggestions
   */
  private async getRoleSuggestions(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchSuggestion[]> {
    const roles = await this.prisma.candidate.groupBy({
      by: ['roleTitle'],
      where: {
        tenantId,
        deletedAt: null,
        roleTitle: { contains: query, mode: 'insensitive' },
      },
      _count: { roleTitle: true },
      orderBy: { _count: { roleTitle: 'desc' } },
      take: limit,
    });

    return roles
      .filter((r) => r.roleTitle)
      .map((r) => ({
        text: r.roleTitle!,
        category: 'role' as const,
        count: r._count.roleTitle,
      }));
  }

  /**
   * Get source suggestions
   */
  private async getSourceSuggestions(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchSuggestion[]> {
    const sources = await this.prisma.candidate.groupBy({
      by: ['source'],
      where: {
        tenantId,
        deletedAt: null,
        source: { contains: query, mode: 'insensitive' },
      },
      _count: { source: true },
      orderBy: { _count: { source: 'desc' } },
      take: limit,
    });

    return sources
      .filter((s) => s.source)
      .map((s) => ({
        text: `source:${s.source}`,
        category: 'field' as const,
        count: s._count.source,
      }));
  }
}
