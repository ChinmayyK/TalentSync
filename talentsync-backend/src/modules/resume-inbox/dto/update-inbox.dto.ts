import { PartialType } from '@nestjs/swagger';
import { CreateResumeInboxDto } from './create-inbox.dto';

export class UpdateResumeInboxDto extends PartialType(CreateResumeInboxDto) {}
