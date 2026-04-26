import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ConnectDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'zoho',
    'salesforce',
    'hubspot',
    'workday',
    'lever',
    'greenhouse',
    'bamboohr',
    'google_calendar',
    'outlook_calendar',
  ])
  provider: string;
}
