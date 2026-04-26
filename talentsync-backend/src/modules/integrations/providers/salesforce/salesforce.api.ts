import { Injectable, Logger } from '@nestjs/common';
import {
  SalesforceOAuthService,
  SalesforceAuthRequiredError,
} from './salesforce.oauth';
import axios, { AxiosInstance } from 'axios';

interface SalesforceQueryResult<T = any> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

export interface SalesforceLead {
  Id: string;
  Name: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  Company?: string;
  Status?: string;
  OwnerId?: string;
  LastModifiedDate: string;
  CreatedDate: string;
}

export interface SalesforceContact {
  Id: string;
  Name: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  AccountId?: string;
  OwnerId?: string;
  LastModifiedDate: string;
  CreatedDate: string;
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  StageName?: string;
  Amount?: number;
  CloseDate?: string;
  Probability?: number;
  AccountId?: string;
  OwnerId?: string;
  LastModifiedDate: string;
  CreatedDate: string;
  Account?: { Name: string };
  Owner?: { Name: string };
}

@Injectable()
export class SalesforceApiService {
  private readonly logger = new Logger(SalesforceApiService.name);
  private readonly apiVersion = 'v59.0';

  constructor(private oauthService: SalesforceOAuthService) {}

  /**
   * Create an authenticated axios instance for Salesforce API calls
   */
  private async getClient(
    tenantId: string,
  ): Promise<{ client: AxiosInstance; instanceUrl: string }> {
    const { accessToken, instanceUrl } =
      await this.oauthService.getAccessToken(tenantId);

    const client = axios.create({
      baseURL: `${instanceUrl}/services/data/${this.apiVersion}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for auth error handling
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (this.oauthService.isAuthError(error)) {
          try {
            const newToken = await this.oauthService.refreshToken(tenantId);
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return axios.request(error.config);
          } catch (refreshError) {
            throw refreshError;
          }
        }
        throw error;
      },
    );

    return { client, instanceUrl };
  }

  /**
   * Execute a SOQL query
   */
  async query<T = any>(
    tenantId: string,
    soql: string,
  ): Promise<SalesforceQueryResult<T>> {
    const { client } = await this.getClient(tenantId);
    const response = await client.get('/query', { params: { q: soql } });
    return response.data;
  }

  /**
   * Get a single record by ID
   */
  async getRecord(
    tenantId: string,
    sobject: string,
    id: string,
    fields?: string[],
  ): Promise<any> {
    const { client } = await this.getClient(tenantId);
    const fieldsParam = fields?.length ? `?fields=${fields.join(',')}` : '';
    const response = await client.get(
      `/sobjects/${sobject}/${id}${fieldsParam}`,
    );
    return response.data;
  }

  /**
   * Create a record
   */
  async createRecord(
    tenantId: string,
    sobject: string,
    data: any,
  ): Promise<{ id: string; success: boolean }> {
    const { client } = await this.getClient(tenantId);
    const response = await client.post(`/sobjects/${sobject}`, data);
    return response.data;
  }

  /**
   * Update a record
   */
  async updateRecord(
    tenantId: string,
    sobject: string,
    id: string,
    data: any,
  ): Promise<void> {
    const { client } = await this.getClient(tenantId);
    await client.patch(`/sobjects/${sobject}/${id}`, data);
  }

  /**
   * Get Leads with optional incremental sync
   */
  async getLeads(tenantId: string, lastSync?: Date): Promise<SalesforceLead[]> {
    let soql = `SELECT Id, Name, FirstName, LastName, Email, Phone, Title, Company, Status, OwnerId, LastModifiedDate, CreatedDate FROM Lead`;

    if (lastSync) {
      soql += ` WHERE LastModifiedDate > ${lastSync.toISOString()}`;
    }

    soql += ' ORDER BY LastModifiedDate DESC LIMIT 2000';

    this.logger.log(
      `Fetching Salesforce Leads for tenant ${tenantId}${lastSync ? ` (since ${lastSync.toISOString()})` : ''}`,
    );

    const result = await this.query<SalesforceLead>(tenantId, soql);
    this.logger.log(`Fetched ${result.records.length} leads from Salesforce`);
    return result.records;
  }

  /**
   * Get Contacts with optional incremental sync
   */
  async getContacts(
    tenantId: string,
    lastSync?: Date,
  ): Promise<SalesforceContact[]> {
    let soql = `SELECT Id, Name, FirstName, LastName, Email, Phone, Title, AccountId, OwnerId, LastModifiedDate, CreatedDate FROM Contact`;

    if (lastSync) {
      soql += ` WHERE LastModifiedDate > ${lastSync.toISOString()}`;
    }

    soql += ' ORDER BY LastModifiedDate DESC LIMIT 2000';

    this.logger.log(
      `Fetching Salesforce Contacts for tenant ${tenantId}${lastSync ? ` (since ${lastSync.toISOString()})` : ''}`,
    );

    const result = await this.query<SalesforceContact>(tenantId, soql);
    this.logger.log(
      `Fetched ${result.records.length} contacts from Salesforce`,
    );
    return result.records;
  }

  /**
   * Get Opportunities with optional incremental sync
   */
  async getOpportunities(
    tenantId: string,
    lastSync?: Date,
  ): Promise<SalesforceOpportunity[]> {
    let soql = `SELECT Id, Name, StageName, Amount, CloseDate, Probability, AccountId, OwnerId, LastModifiedDate, CreatedDate, Account.Name, Owner.Name FROM Opportunity`;

    if (lastSync) {
      soql += ` WHERE LastModifiedDate > ${lastSync.toISOString()}`;
    }

    soql += ' ORDER BY LastModifiedDate DESC LIMIT 2000';

    this.logger.log(
      `Fetching Salesforce Opportunities for tenant ${tenantId}${lastSync ? ` (since ${lastSync.toISOString()})` : ''}`,
    );

    const result = await this.query<SalesforceOpportunity>(tenantId, soql);
    this.logger.log(
      `Fetched ${result.records.length} opportunities from Salesforce`,
    );
    return result.records;
  }

  /**
   * Describe an object to get field metadata
   */
  async describeObject(tenantId: string, sobject: string): Promise<any> {
    const { client } = await this.getClient(tenantId);
    const response = await client.get(`/sobjects/${sobject}/describe`);
    return response.data;
  }
}
