import { Injectable } from '@nestjs/common';
import { SalesforceService } from '../providers/salesforce/salesforce.service';
import { HubspotService } from '../providers/hubspot/hubspot.service';
import { WorkdayService } from '../providers/workday/workday.service';
import { IntegrationConnector } from './integration.interface';

@Injectable()
export class IntegrationFactory {
    constructor(
        private salesforce: SalesforceService,
        private hubspot: HubspotService,
        private workday: WorkdayService
    ) { }

    getConnector(provider: string): IntegrationConnector {
        switch (provider) {
            case 'salesforce': return this.salesforce;
            case 'hubspot': return this.hubspot;
            case 'workday': return this.workday;
            default: throw new Error(`Unsupported provider: ${provider}`);
        }
    }
}
