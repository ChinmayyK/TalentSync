import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInterviewNoteDto {
  @ApiProperty({
    description: 'Note content',
    example: 'Candidate showed strong problem-solving skills',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}

export class UpdateInterviewNoteDto {
  @ApiProperty({ description: 'Updated note content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
