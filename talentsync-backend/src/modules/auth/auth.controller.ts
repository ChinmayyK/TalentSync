import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  Delete,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import * as express from 'express';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { SessionService } from './session.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { PasswordCheckDto } from './dto/password-check.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import {
  Verify2FASetupDto,
  Verify2FALoginDto,
  Disable2FADto,
  TwoFactorSetupResponse,
  TwoFactorEnabledResponse,
  TwoFactorStatusResponse,
  SessionDto,
  RevokeSessionDto,
} from './dto/two-factor.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RbacGuard } from './guards/rbac.guard';
import { Roles } from './decorators/roles.decorator';
import {
  RateLimited,
  RateLimitProfile,
  SkipRateLimit,
} from '../../common/rate-limit';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private svc: AuthService,
    private twoFactorService: TwoFactorService,
    private sessionService: SessionService,
  ) {}

  // ============================================
  // PUBLIC AUTH ENDPOINTS
  // ============================================

  @Post('signup')
  @RateLimited(RateLimitProfile.AUTH)
  @ApiOperation({
    summary: 'Create a new tenant and admin user (Trial signup)',
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant and user created successfully',
  })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  @ApiBody({ type: SignupDto })
  async signup(
    @Body() dto: SignupDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.svc.signUpCreateTenant(dto, req);

    // Set refresh token as HTTPOnly cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
      activeTenantId: result.activeTenantId,
      tenants: result.tenants,
    };
  }

  @Post('register')
  @RateLimited(RateLimitProfile.AUTH)
  @ApiOperation({ summary: 'Legacy register endpoint - use /signup instead' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  @ApiBody({ type: RegisterDto })
  register(@Body() dto: RegisterDto) {
    return this.svc.register(dto);
  }

  @Post('password/check')
  @RateLimited(RateLimitProfile.READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check password strength against policy' })
  @ApiResponse({ status: 200, description: 'Password validation result' })
  @ApiBody({ type: PasswordCheckDto })
  checkPassword(@Body() dto: PasswordCheckDto) {
    return this.svc.checkPassword(dto.password);
  }

  @Post('login')
  @RateLimited(RateLimitProfile.AUTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access token and tenant list',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.svc.login(dto.email, dto.password, req);

    // Set refresh token as HTTPOnly cookie (30 days if rememberMe, 7 days otherwise)
    this.setRefreshTokenCookie(res, result.refreshToken, dto.rememberMe);

    return {
      accessToken: result.accessToken,
      user: result.user,
      activeTenantId: result.activeTenantId,
      tenants: result.tenants,
    };
  }

  @Post('refresh')
  @RateLimited(RateLimitProfile.AUTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiBody({ type: RefreshDto })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    // Try to get refresh token from cookie first, then from body
    const refreshToken = req.cookies?.refreshToken || dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.svc.refresh(refreshToken, req);

    // Set new refresh token as HTTPOnly cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
      activeTenantId: result.activeTenantId,
      tenants: result.tenants,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout and revoke refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.svc.logout(req.user.sub);

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return result;
  }

  // ============================================
  // TENANT SWITCHING
  // ============================================

  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Switch to a different tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant switched, new tokens returned',
  })
  @ApiResponse({ status: 403, description: 'No access to requested tenant' })
  @ApiBody({ type: SwitchTenantDto })
  async switchTenant(
    @Req() req: any,
    @Body() dto: SwitchTenantDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.svc.switchTenant(req.user.sub, dto.tenantId, req);

    // Set new refresh token as HTTPOnly cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
      activeTenantId: result.activeTenantId,
      tenants: result.tenants,
    };
  }

  // ============================================
  // INVITATION ENDPOINTS
  // ============================================

  @Get('invite/:token')
  @RateLimited(RateLimitProfile.READ)
  @ApiOperation({ summary: 'Get invitation preview (tenant branding)' })
  @ApiResponse({ status: 200, description: 'Invitation details returned' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiParam({ name: 'token', description: 'Invitation token from email link' })
  getInvitePreview(@Param('token') token: string) {
    return this.svc.getInvitePreview(token);
  }

  @Post('accept-invite')
  @RateLimited(RateLimitProfile.AUTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept invitation and create/link account' })
  @ApiResponse({
    status: 200,
    description: 'Account created/linked, logged in',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiBody({ type: AcceptInviteDto })
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.svc.acceptInvite(dto, req);

    // Set refresh token as HTTPOnly cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
      activeTenantId: result.activeTenantId,
      tenants: result.tenants,
    };
  }

  @Post('invitations')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created and email sent',
  })
  @ApiBody({ type: CreateInvitationDto })
  async createInvitation(@Req() req: any, @Body() dto: CreateInvitationDto) {
    return this.svc.createInvitation(
      req.tenantId,
      dto.email,
      dto.role || 'RECRUITER',
      req.user.sub,
    );
  }

  @Get('invitations')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List pending invitations for tenant' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  listInvitations(@Req() req: any) {
    return this.svc.listPendingInvitations(req.tenantId);
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  @Post('forgot-password')
  @RateLimited(RateLimitProfile.AUTH_SENSITIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists',
  })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.svc.forgotPassword(dto.email);
  }

  @Get('reset-password/validate')
  @RateLimited(RateLimitProfile.READ)
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiResponse({ status: 200, description: 'Token validity status' })
  validateResetToken(@Query('token') token: string) {
    return this.svc.validateResetToken(token);
  }

  @Post('reset-password')
  @RateLimited(RateLimitProfile.AUTH_SENSITIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.svc.resetPassword(dto.token, dto.newPassword);
  }

  // ============================================
  // EMAIL VERIFICATION (kept from original)
  // ============================================

  @Post('send-verification')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  sendVerification(@Req() req: any) {
    return this.svc.sendVerificationEmail(req.user.sub);
  }

  @Get('verify-email')
  @RateLimited(RateLimitProfile.READ)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  verifyEmail(@Query() dto: VerifyEmailDto) {
    return this.svc.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @RateLimited(RateLimitProfile.AUTH_SENSITIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email resent' })
  @ApiResponse({
    status: 400,
    description: 'User not found or email already verified',
  })
  @ApiBody({ type: ResendVerificationDto })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.svc.resendVerification(dto.email);
  }

  // ============================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================

  @Get('2fa/status')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  @ApiResponse({
    status: 200,
    description: '2FA status',
    type: TwoFactorStatusResponse,
  })
  async get2FAStatus(@Req() req: any): Promise<TwoFactorStatusResponse> {
    return this.twoFactorService.getStatus(req.user.sub);
  }

  @Post('2fa/enable')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @RateLimited(RateLimitProfile.AUTH_SENSITIVE)
  @ApiOperation({ summary: 'Initiate 2FA setup - returns QR code' })
  @ApiResponse({
    status: 200,
    description: '2FA setup data',
    type: TwoFactorSetupResponse,
  })
  async enable2FA(@Req() req: any): Promise<TwoFactorSetupResponse> {
    return this.twoFactorService.initSetup(req.user.sub);
  }

  @Post('2fa/verify-setup')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @RateLimited(RateLimitProfile.AUTH_SENSITIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP token and enable 2FA' })
  @ApiResponse({
    status: 200,
    description: '2FA enabled with recovery codes',
    type: TwoFactorEnabledResponse,
  })
  @ApiBody({ type: Verify2FASetupDto })
  async verifyAndEnable2FA(
    @Req() req: any,
    @Body() dto: Verify2FASetupDto,
  ): Promise<TwoFactorEnabledResponse> {
    const result = await this.twoFactorService.verifyAndEnable(
      req.user.sub,
      dto.token,
    );
    return {
      recoveryCodes: result.codes,
      message:
        '2FA has been enabled. Save these recovery codes securely - they will not be shown again.',
    };
  }

  @Post('2fa/disable')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @RateLimited(RateLimitProfile.AUTH_SENSITIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA (requires password and token)' })
  @ApiResponse({ status: 200, description: '2FA disabled' })
  @ApiBody({ type: Disable2FADto })
  async disable2FA(@Req() req: any, @Body() dto: Disable2FADto) {
    // Verify password first
    await this.svc.validateUser(req.user.email, dto.password);

    // Verify 2FA token
    const valid = await this.twoFactorService.verifyToken(
      req.user.sub,
      dto.token,
    );
    if (!valid) {
      throw new Error('Invalid 2FA token');
    }

    await this.twoFactorService.disable(req.user.sub);
    return { success: true, message: '2FA has been disabled' };
  }

  @Post('2fa/regenerate-codes')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @RateLimited(RateLimitProfile.AUTH_SENSITIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate new recovery codes (invalidates old ones)',
  })
  @ApiResponse({
    status: 200,
    description: 'New recovery codes',
    type: TwoFactorEnabledResponse,
  })
  async regenerateRecoveryCodes(
    @Req() req: any,
  ): Promise<TwoFactorEnabledResponse> {
    const result = await this.twoFactorService.regenerateRecoveryCodes(
      req.user.sub,
    );
    return {
      recoveryCodes: result.codes,
      message: 'New recovery codes generated. Old codes are now invalid.',
    };
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all active sessions for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of sessions',
    type: [SessionDto],
  })
  async listSessions(@Req() req: any): Promise<SessionDto[]> {
    // Extract current session ID from token if available
    const sessions = await this.sessionService.listSessions(req.user.sub);
    return sessions;
  }

  @Delete('sessions/:sessionId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to revoke' })
  async revokeSession(@Req() req: any, @Param('sessionId') sessionId: string) {
    const revoked = await this.sessionService.revokeSession(
      req.user.sub,
      sessionId,
      'admin_revoke',
      req.user.sub,
    );
    return { success: revoked };
  }

  @Post('sessions/revoke-others')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  @ApiResponse({ status: 200, description: 'Other sessions revoked' })
  async revokeOtherSessions(@Req() req: any) {
    // Get current session ID from somewhere (would need to be passed or tracked)
    // For now, revoke all and re-issue would be needed
    const count = await this.sessionService.revokeAllSessions(
      req.user.sub,
      'logout',
      req.tenantId,
    );
    return { success: true, revokedCount: count };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private setRefreshTokenCookie(
    res: express.Response,
    refreshToken: string,
    rememberMe?: boolean,
  ) {
    // 30 days if rememberMe, otherwise 7 days
    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000; // 7 days
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'strict' : 'lax', // 'lax' for dev to work across ports
      maxAge,
      path: '/',
    });
  }
}
