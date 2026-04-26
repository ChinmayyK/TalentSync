import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ListCandidatesDto } from './dto/list-candidates.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import {
  CreateCandidateNoteDto,
  UpdateCandidateNoteDto,
} from './dto/candidate-note.dto';
import {
  TransitionStageDto,
  RejectCandidateDto,
  StageTransitionResponseDto,
  StageHistoryEntryDto,
} from './dto/transition-stage.dto';
import {
  ParseResumeDto,
  BulkParseResumesDto,
  ParsedResumeResponseDto,
  BulkParseResponseDto,
  CreateCandidateFromResumeDto,
} from './dto/resume-parser.dto';
import { StageTransitionService } from './services/stage-transition.service';
import { ResumeParserService } from './services/resume-parser.service';
import { TimelineService } from './services/timeline.service';
import { SearchSuggestionsService } from './services/search-suggestions.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimited, RateLimitProfile } from '../../common/rate-limit';

@ApiTags('candidates')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/candidates')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CandidatesController {
  constructor(
    private svc: CandidatesService,
    private stageTransitionService: StageTransitionService,
    private resumeParserService: ResumeParserService,
    private timelineService: TimelineService,
    private searchSuggestionsService: SearchSuggestionsService,
    private semanticSearchService: SemanticSearchService,
  ) {}

  @Post()
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Create a new candidate' })
  @ApiResponse({ status: 201, description: 'Candidate created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: CreateCandidateDto })
  create(@Req() req: any, @Body() dto: CreateCandidateDto) {
    return this.svc.create(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'List all candidates with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of candidates' })
  list(@Req() req: any, @Query() dto: ListCandidatesDto) {
    return this.svc.list(req.user.tenantId, dto);
  }

  @Get('search/suggestions')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Get search suggestions for autocomplete' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query prefix' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max suggestions to return',
  })
  @ApiResponse({ status: 200, description: 'Search suggestions' })
  getSearchSuggestions(
    @Req() req: any,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchSuggestionsService.getSuggestions(
      req.user.tenantId,
      query,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('search/semantic')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Semantic search using AI embeddings' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Natural language search query',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Semantic search results with relevance scores',
  })
  async semanticSearch(
    @Req() req: any,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!this.semanticSearchService.isAvailable()) {
      return {
        available: false,
        message:
          'Semantic search is not configured. Set OPENAI_API_KEY to enable.',
        results: [],
      };
    }

    const results = await this.semanticSearchService.search(
      req.user.tenantId,
      query,
      limit ? parseInt(limit, 10) : 20,
    );

    return {
      available: true,
      query,
      results,
    };
  }

  @Get(':id')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Get candidate by ID' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiResponse({ status: 200, description: 'Candidate details' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.get(req.user.tenantId, id);
  }

  @Patch(':id')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.svc.update(req.user.tenantId, req.user.sub, id, dto);
  }

  @Delete(':id')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.svc.delete(req.user.tenantId, req.user.sub, id);
  }

  // =====================================================
  // STAGE TRANSITIONS
  // =====================================================

  @Post(':id/transition')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Transition candidate to a new stage' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiBody({ type: TransitionStageDto })
  @ApiResponse({
    status: 200,
    description: 'Stage transition successful',
    type: StageTransitionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid stage or transition not allowed',
  })
  @ApiResponse({ status: 403, description: 'Candidate is in terminal stage' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async transitionStage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: TransitionStageDto,
  ) {
    // Only ADMIN can use allowOverride
    const allowOverride = req.user.role === 'ADMIN' ? dto.allowOverride : false;

    return this.stageTransitionService.transitionStage(req.user.tenantId, {
      candidateId: id,
      newStage: dto.newStage,
      source: 'USER',
      triggeredBy: 'MANUAL',
      actorId: req.user.sub,
      reason: dto.reason,
      allowOverride,
    });
  }

  @Post(':id/reject')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({
    summary: 'Reject a candidate (moves to terminal REJECTED stage)',
  })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiBody({ type: RejectCandidateDto })
  @ApiResponse({
    status: 200,
    description: 'Candidate rejected successfully',
    type: StageTransitionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Reason is required' })
  @ApiResponse({
    status: 403,
    description: 'Candidate is already in terminal stage',
  })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async rejectCandidate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RejectCandidateDto,
  ) {
    return this.stageTransitionService.rejectCandidate(
      req.user.tenantId,
      id,
      dto.reason,
      req.user.sub,
    );
  }

  @Get(':id/stage-history')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({
    summary: 'Get full stage transition history for a candidate',
  })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiResponse({
    status: 200,
    description: 'Stage transition history',
    type: [StageHistoryEntryDto],
  })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async getStageHistory(@Req() req: any, @Param('id') id: string) {
    return this.stageTransitionService.getStageHistory(req.user.tenantId, id);
  }

  @Get(':id/timeline')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Get unified activity timeline for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiResponse({
    status: 200,
    description: 'Timeline of all candidate activities',
  })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async getTimeline(@Req() req: any, @Param('id') id: string) {
    return this.timelineService.getCandidateTimeline(req.user.tenantId, id);
  }

  // =====================================================
  // RESUME / DOCUMENTS
  // =====================================================

  @Post(':id/resume/upload-url')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  uploadUrl(
    @Req() req: any,
    @Param('id') id: string,
    @Body('filename') filename: string,
  ) {
    return this.svc.generateResumeUploadUrl(
      req.user.tenantId,
      req.user.sub,
      id,
      filename,
    );
  }

  @Post(':id/resume/attach')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  attachResume(
    @Req() req: any,
    @Param('id') id: string,
    @Body('fileId') fileId: string,
    @Body('s3Key') s3Key: string,
    @Body('mimeType') mimeType?: string,
    @Body('size') size?: number,
  ) {
    return this.svc.attachResume(
      req.user.tenantId,
      req.user.sub,
      id,
      fileId,
      s3Key,
      mimeType,
      size,
    );
  }

  // =====================================================
  // CANDIDATE PHOTO
  // =====================================================

  @Post(':id/photo/upload-url')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Get a presigned URL to upload candidate photo' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiBody({ schema: { properties: { filename: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Presigned upload URL' })
  photoUploadUrl(
    @Req() req: any,
    @Param('id') id: string,
    @Body('filename') filename: string,
  ) {
    return this.svc.generatePhotoUploadUrl(
      req.user.tenantId,
      req.user.sub,
      id,
      filename,
    );
  }

  @Post(':id/photo/attach')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Attach uploaded photo to candidate' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiBody({
    schema: {
      properties: { fileId: { type: 'string' }, s3Key: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Photo attached to candidate' })
  attachPhoto(
    @Req() req: any,
    @Param('id') id: string,
    @Body('fileId') fileId: string,
    @Body('s3Key') s3Key: string,
  ) {
    return this.svc.attachPhoto(
      req.user.tenantId,
      req.user.sub,
      id,
      fileId,
      s3Key,
    );
  }

  @Post('bulk-import')
  @RateLimited(RateLimitProfile.BULK)
  @Roles('ADMIN', 'MANAGER')
  bulkImport(@Req() req: any, @Body() body: any) {
    // Check if this is direct row import or URL-based import
    if (body.rows && Array.isArray(body.rows)) {
      return this.svc.directBulkImport(
        req.user.tenantId,
        req.user.sub,
        body.rows,
      );
    }
    // Fall back to URL-based import
    return this.svc.bulkImport(req.user.tenantId, req.user.sub, body);
  }

  @Post('import-from-file')
  @RateLimited(RateLimitProfile.BULK)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Import candidates from an uploaded CSV or Excel file',
  })
  @ApiBody({
    schema: {
      properties: {
        fileId: { type: 'string', description: 'ID of the uploaded file' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Import results with success/failure counts',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or parsing error',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  importFromFile(@Req() req: any, @Body('fileId') fileId: string) {
    return this.svc.importFromFile(req.user.tenantId, req.user.sub, fileId);
  }

  // =====================================================
  // RESUME PARSING
  // =====================================================

  @Post('resume/parse')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Parse a resume file to extract candidate info' })
  @ApiBody({ type: ParseResumeDto })
  @ApiResponse({
    status: 200,
    description: 'Resume parsed successfully',
    type: ParsedResumeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async parseResume(@Req() req: any, @Body() dto: ParseResumeDto) {
    const result = await this.resumeParserService.parseResume(
      req.user.tenantId,
      dto.fileId,
    );

    // Log parsing action for audit
    await this.svc.logResumeParseAction(
      req.user.tenantId,
      req.user.sub,
      dto.fileId,
      result.status,
    );

    return result;
  }

  @Post('resume/parse-bulk')
  @RateLimited(RateLimitProfile.BULK)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Parse multiple resume files' })
  @ApiBody({ type: BulkParseResumesDto })
  @ApiResponse({
    status: 200,
    description: 'Resumes parsed',
    type: BulkParseResponseDto,
  })
  async parseResumesBulk(@Req() req: any, @Body() dto: BulkParseResumesDto) {
    const result = await this.resumeParserService.parseResumes(
      req.user.tenantId,
      dto.fileIds,
    );

    // Log bulk parsing for audit
    await this.svc.logBulkResumeParseAction(
      req.user.tenantId,
      req.user.sub,
      dto.fileIds,
      result.summary,
    );

    return result;
  }

  @Post('from-resume')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({
    summary: 'Create a candidate from parsed resume data (review-then-save)',
  })
  @ApiBody({ type: CreateCandidateFromResumeDto })
  @ApiResponse({ status: 201, description: 'Candidate created from resume' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Resume file not found' })
  async createFromResume(
    @Req() req: any,
    @Body() dto: CreateCandidateFromResumeDto,
  ) {
    return this.svc.createFromResume(req.user.tenantId, req.user.sub, dto);
  }

  // =====================================================
  // CANDIDATE DOCUMENTS
  // =====================================================

  @Get(':id/documents')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'List all documents for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  listDocuments(@Req() req: any, @Param('id') id: string) {
    return this.svc.listDocuments(req.user.tenantId, id);
  }

  // =====================================================
  // CANDIDATE NOTES
  // =====================================================

  @Get(':id/notes')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'List all notes for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiResponse({
    status: 200,
    description: 'List of notes with author details',
  })
  listNotes(@Req() req: any, @Param('id') id: string) {
    return this.svc.listNotes(req.user.tenantId, id);
  }

  @Post(':id/notes')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Add a note to a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiBody({ type: CreateCandidateNoteDto })
  @ApiResponse({ status: 201, description: 'Note created' })
  addNote(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCandidateNoteDto,
  ) {
    return this.svc.addNote(req.user.tenantId, id, req.user.sub, dto.content);
  }

  @Patch(':id/notes/:noteId')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Update a candidate note (author or admin)' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiParam({ name: 'noteId', description: 'Note ID' })
  @ApiBody({ type: UpdateCandidateNoteDto })
  @ApiResponse({ status: 200, description: 'Note updated' })
  updateNote(
    @Req() req: any,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateCandidateNoteDto,
  ) {
    return this.svc.updateNote(
      req.user.tenantId,
      noteId,
      req.user.sub,
      req.user.role,
      dto.content,
    );
  }

  @Delete(':id/notes/:noteId')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Delete a candidate note (author or admin)' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiParam({ name: 'noteId', description: 'Note ID' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  deleteNote(@Req() req: any, @Param('noteId') noteId: string) {
    return this.svc.deleteNote(
      req.user.tenantId,
      noteId,
      req.user.sub,
      req.user.role,
    );
  }
}
