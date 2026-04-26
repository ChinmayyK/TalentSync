import { Module, forwardRef } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { PrismaService } from '../../common/prisma.service';
import {
  AvailabilityService,
  BusyBlockService,
  CalendarSyncService,
  GoogleCalendarOAuthService,
  MicrosoftCalendarOAuthService,
  SchedulingRulesService,
  SlotService,
  SuggestionService,
  WorkingHoursService,
} from './services';
import { InterviewsModule } from '../interviews/interviews.module';

@Module({
  imports: [forwardRef(() => InterviewsModule)],
  controllers: [CalendarController],
  providers: [
    PrismaService,
    AvailabilityService,
    BusyBlockService,
    CalendarSyncService,
    GoogleCalendarOAuthService,
    MicrosoftCalendarOAuthService,
    SchedulingRulesService,
    SlotService,
    SuggestionService,
    WorkingHoursService,
  ],
  exports: [
    AvailabilityService,
    BusyBlockService,
    CalendarSyncService,
    GoogleCalendarOAuthService,
    MicrosoftCalendarOAuthService,
    SchedulingRulesService,
    SlotService,
    SuggestionService,
    WorkingHoursService,
  ],
})
export class CalendarModule {}
