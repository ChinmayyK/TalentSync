import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCandidateNoteDto {
  @ApiProperty({
    description: 'Note content',
    example: 'Great communication skills during screen',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}

export class UpdateCandidateNoteDto {
  @ApiProperty({ description: 'Updated note content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
