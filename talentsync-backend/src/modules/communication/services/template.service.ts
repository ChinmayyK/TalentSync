import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  PreviewTemplateDto,
} from '../dto';
import { Channel, TemplateCategory } from '@prisma/client';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {
    // Register Handlebars helpers
    this.registerHelpers();
  }

  /**
   * Get all templates for tenant
   */
  async findAll(
    tenantId: string,
    channel?: Channel,
    category?: TemplateCategory,
  ) {
    const where: any = { tenantId };
    if (channel) where.channel = channel;
    if (category) where.category = category;

    return this.prisma.messageTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get single template
   */
  async findOne(tenantId: string, id: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Create new template
   */
  async create(tenantId: string, dto: CreateTemplateDto, userId?: string) {
    // Check for duplicate name+channel
    const existing = await this.prisma.messageTemplate.findFirst({
      where: { tenantId, name: dto.name, channel: dto.channel },
    });

    if (existing) {
      throw new ConflictException(
        'A template with this name already exists for this channel',
      );
    }

    // Extract variables from body
    const extractedVars = this.extractVariables(dto.body);
    const variables = dto.variables?.length ? dto.variables : extractedVars;

    return this.prisma.messageTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        channel: dto.channel,
        category: dto.category,
        subject: dto.subject,
        body: dto.body,
        variables,
        createdById: userId,
      },
    });
  }

  /**
   * Update template
   */
  async update(tenantId: string, id: string, dto: UpdateTemplateDto) {
    const template = await this.findOne(tenantId, id);

    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be modified');
    }

    // If name is being changed, check for conflicts
    if (dto.name && dto.name !== template.name) {
      const existing = await this.prisma.messageTemplate.findFirst({
        where: {
          tenantId,
          name: dto.name,
          channel: template.channel,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('A template with this name already exists');
      }
    }

    // Extract variables from updated body
    let variables = template.variables;
    if (dto.body) {
      variables = this.extractVariables(dto.body);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create a history record of the CURRENT state (before update)
      // We give it a new ID, but keep the SAME version number as the state it represents
      // But wait, we can't have duplicate [name, channel, version].
      // So we must increment the CURRENT row's version first?
      // Or we store history with a modified name? No, want to track same template.

      // Actually, best approach for stable ID:
      // 1. Update the CURRENT row (keeping ID) to version + 1
      // 2. Create a NEW row for the OLD version.

      // Step 1: Update current
      const updated = await tx.messageTemplate.update({
        where: { id },
        data: {
          ...dto,
          variables,
          version: { increment: 1 },
        },
      });

      // Step 2: Write history (the old state)
      // We need to bypass the unique constraint? No, the updated row has version+1.
      // So we can write a row with version (original).
      await tx.messageTemplate.create({
        data: {
          tenantId,
          name: template.name, // Name must match for "history" of this template? Or strictly by ID?
          // If we want to group by name in UI, yes.
          channel: template.channel,
          category: template.category,
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          createdById: template.createdById, // Preserver original creator
          createdAt: template.createdAt, // Preserve original date
          version: template.version, // The old version number
          isSystem: false, // History is not system? Or keep?
          isActive: false, // Archive it
          // ID will be auto-generated
        },
      });

      return updated;
    });
  }

  /**
   * Delete template
   */
  async delete(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);

    if (template.isSystem) {
      throw new BadRequestException('System templates cannot be deleted');
    }

    // Check if used by any automation rules
    const usedByRules = await this.prisma.automationRule.count({
      where: { templateId: id },
    });

    if (usedByRules > 0) {
      throw new BadRequestException(
        `This template is used by ${usedByRules} automation rule(s). Remove those first.`,
      );
    }

    return this.prisma.messageTemplate.delete({ where: { id } });
  }

  /**
   * Duplicate template
   */
  async duplicate(tenantId: string, id: string, newName: string) {
    const template = await this.findOne(tenantId, id);

    return this.prisma.messageTemplate.create({
      data: {
        tenantId,
        name: newName,
        channel: template.channel,
        category: template.category,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        isSystem: false,
        version: 1,
      },
    });
  }

  /**
   * Preview template with sample data
   */
  preview(
    template: { subject?: string; body: string },
    context: Record<string, any>,
  ) {
    const renderedSubject = template.subject
      ? this.render(template.subject, context)
      : '';
    const renderedBody = this.render(template.body, context);

    return {
      subject: renderedSubject,
      body: renderedBody,
    };
  }

  /**
   * Render template with context
   */
  render(templateString: string, context: Record<string, any>): string {
    try {
      const compiled = Handlebars.compile(templateString, { strict: false });
      return compiled(context);
    } catch (error) {
      console.error('Template rendering error:', error);
      return templateString; // Return original on error
    }
  }

  /**
   * Get available template variables for a context type
   */
  getAvailableVariables() {
    return {
      candidate: [
        { name: 'candidate.name', description: 'Candidate full name' },
        { name: 'candidate.email', description: 'Candidate email' },
        { name: 'candidate.phone', description: 'Candidate phone' },
        { name: 'candidate.roleTitle', description: 'Applied role/position' },
      ],
      interview: [
        { name: 'interview.date', description: 'Interview date (formatted)' },
        { name: 'interview.time', description: 'Interview time' },
        { name: 'interview.duration', description: 'Duration in minutes' },
        { name: 'interview.stage', description: 'Interview stage' },
        { name: 'interview.link', description: 'Meeting link' },
      ],
      interviewer: [
        { name: 'interviewer.name', description: 'Interviewer name' },
        { name: 'interviewer.email', description: 'Interviewer email' },
      ],
      company: [
        { name: 'company.name', description: 'Company name' },
        { name: 'company.domain', description: 'Company domain' },
      ],
    };
  }

  /**
   * Get template versions
   */
  async getVersions(tenantId: string, name: string, channel: Channel) {
    return this.prisma.messageTemplate.findMany({
      where: { tenantId, name, channel },
      orderBy: { version: 'desc' },
    });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private extractVariables(templateString: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: Set<string> = new Set();
    let match;

    while ((match = regex.exec(templateString)) !== null) {
      // Clean up the variable name (remove helper prefixes, trim whitespace)
      const varName = match[1].trim().split(' ')[0];
      if (!varName.startsWith('#') && !varName.startsWith('/')) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  private registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper(
      'formatDate',
      (date: Date | string, format?: string) => {
        if (!date) return '';
        const d = new Date(date);
        // Simple formatting - in production use date-fns or moment
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
    );

    // Time formatting helper
    Handlebars.registerHelper('formatTime', (date: Date | string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase helper
    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', (str: string) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    });

    // Default value helper
    Handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value || defaultValue;
    });
  }
}
