import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationFactory } from './integration-factory.service';
import { SalesforceService } from '../providers/salesforce/salesforce.service';
import { HubspotService } from '../providers/hubspot/hubspot.service';
import { WorkdayService } from '../providers/workday/workday.service';

describe('IntegrationFactory', () => {
    let factory: IntegrationFactory;
    let salesforce: SalesforceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IntegrationFactory,
                { provide: SalesforceService, useValue: { provider: 'salesforce' } },
                { provide: HubspotService, useValue: { provider: 'hubspot' } },
                { provide: WorkdayService, useValue: { provider: 'workday' } },
            ],
        }).compile();

        factory = module.get<IntegrationFactory>(IntegrationFactory);
        salesforce = module.get<SalesforceService>(SalesforceService);
    });

    it('should return salesforce service for salesforce provider', () => {
        const service = factory.getConnector('salesforce');
        expect(service).toBeDefined();
        expect(service.provider).toBe('salesforce');
    });

    it('should throw error for unknown provider', () => {
        expect(() => factory.getConnector('unknown')).toThrow('Unsupported provider: unknown');
    });
});
