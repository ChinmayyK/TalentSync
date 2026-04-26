import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';

/**
 * Public controller for OAuth callbacks - no authentication required
 * OAuth providers redirect here after user authentication
 */
@ApiTags('integrations-oauth')
@Controller('api/v1')
export class OAuthCallbackController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get('oauth/callback')
  @ApiOperation({
    summary: 'Handle generic OAuth callback from provider (public endpoint)',
  })
  @ApiQuery({ name: 'code', description: 'Authorization code from provider' })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend after success',
  })
  @ApiResponse({ status: 400, description: 'Invalid code or state' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      // The provider is determined from the state
      // For now, assume 'zoho' as the provider since it's the only one we're implementing
      const result = await this.integrationsService.callback(
        'zoho',
        code,
        state,
        'system',
      );
      // Redirect to frontend integrations page with success
      return res.redirect(
        `${frontendUrl}/integrations?status=success&provider=${result.provider}`,
      );
    } catch (error) {
      // Redirect to frontend integrations page with error
      return res.redirect(
        `${frontendUrl}/integrations?status=error&message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @Get('integrations/oauth/hubspot/callback')
  @ApiOperation({ summary: 'Handle HubSpot OAuth callback (public endpoint)' })
  @ApiQuery({ name: 'code', description: 'Authorization code from HubSpot' })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend after success',
  })
  @ApiResponse({ status: 400, description: 'Invalid code or state' })
  async hubspotCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      const result = await this.integrationsService.callback(
        'hubspot',
        code,
        state,
        'system',
      );
      return res.redirect(
        `${frontendUrl}/integrations?status=success&provider=${result.provider}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.redirect(
        `${frontendUrl}/integrations?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get('integrations/oauth/salesforce/callback')
  @ApiOperation({
    summary: 'Handle Salesforce OAuth callback (public endpoint)',
  })
  @ApiQuery({ name: 'code', description: 'Authorization code from Salesforce' })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend after success',
  })
  @ApiResponse({ status: 400, description: 'Invalid code or state' })
  async salesforceCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      const result = await this.integrationsService.callback(
        'salesforce',
        code,
        state,
        'system',
      );
      return res.redirect(
        `${frontendUrl}/integrations?status=success&provider=${result.provider}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.redirect(
        `${frontendUrl}/integrations?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get('integrations/oauth/zoho/callback')
  @ApiOperation({ summary: 'Handle Zoho OAuth callback (public endpoint)' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Zoho' })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend after success',
  })
  @ApiResponse({ status: 400, description: 'Invalid code or state' })
  async zohoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      const result = await this.integrationsService.callback(
        'zoho',
        code,
        state,
        'system',
      );
      return res.redirect(
        `${frontendUrl}/integrations?status=success&provider=${result.provider}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.redirect(
        `${frontendUrl}/integrations?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get('integrations/oauth/workday/callback')
  @ApiOperation({ summary: 'Handle Workday OAuth callback (public endpoint)' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Workday' })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend after success',
  })
  @ApiResponse({ status: 400, description: 'Invalid code or state' })
  async workdayCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      const result = await this.integrationsService.callback(
        'workday',
        code,
        state,
        'system',
      );
      return res.redirect(
        `${frontendUrl}/integrations?status=success&provider=${result.provider}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.redirect(
        `${frontendUrl}/integrations?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get('integrations/oauth/lever/callback')
  @ApiOperation({ summary: 'Handle Lever OAuth callback (public endpoint)' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Lever' })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend after success',
  })
  @ApiResponse({ status: 400, description: 'Invalid code or state' })
  async leverCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      const result = await this.integrationsService.callback(
        'lever',
        code,
        state,
        'system',
      );
      return res.redirect(
        `${frontendUrl}/integrations?status=success&provider=${result.provider}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.redirect(
        `${frontendUrl}/integrations?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get('integrations/oauth/bamboohr/callback')
  @ApiOperation({ summary: 'Handle BambooHR OAuth callback (public endpoint)' })
  @ApiQuery({ name: 'code', description: 'Authorization code from BambooHR' })
  @ApiQuery({
    name: 'state',
    description: 'State parameter containing tenantId and companyDomain',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend after success',
  })
  @ApiResponse({ status: 400, description: 'Invalid code or state' })
  async bamboohrCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      // BambooHR state contains tenantId and companyDomain
      const result = await this.integrationsService.callback(
        'bamboohr',
        code,
        state,
        'system',
      );
      return res.redirect(
        `${frontendUrl}/integrations?status=success&provider=${result.provider}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.redirect(
        `${frontendUrl}/integrations?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  }
}
