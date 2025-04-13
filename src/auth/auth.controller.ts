// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
  Get,
  Headers,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenService } from '@refresh-token/refresh-token.service';
import { RefreshTokenCleanupService } from '@refresh-token/refresh-token.cleanup.service';
import { User } from '@users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly refreshTokenCleanupService: RefreshTokenCleanupService,
  ) {}

  @Post('register')
  async register(@Body() userData: RegisterUserDto) {
    try {
      return await this.authService.register(userData);
    } catch (error) {
      throw new HttpException(
        'Registration failed: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Req() request?: any,
  ) {
    try {
      const result = await this.authService.login(loginDto);
      
      // Get the full user entity for the refresh token service
      const user = await this.authService.getUserById(result.user.id);
      
      const refreshToken = await this.refreshTokenService.createRefreshToken(
        user,
        undefined,
        request?.ip,
        userAgent,
      );

      return {
        ...result,
        refresh_token: refreshToken.jti,
      };
    } catch (error) {
      throw new HttpException(
        'Login failed: ' + error.message,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('refresh')
  async refreshToken(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new HttpException(
        'Refresh token is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.refreshTokenService.refreshAccessToken(refreshToken);
    } catch (error) {
      throw new HttpException(
        'Refresh token invalid or expired: ' + error.message,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new HttpException(
        'Refresh token is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.refreshTokenService.revokeRefreshToken(refreshToken);
      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to logout: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('password-reset/request')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    try {
      return await this.authService.requestPasswordReset(dto);
    } catch (error) {
      throw new HttpException(
        'Failed to request password reset: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('password-reset/reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      return await this.authService.resetPassword(dto);
    } catch (error) {
      throw new HttpException(
        'Failed to reset password: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    try {
      return await this.authService.verifyEmail(token);
    } catch (error) {
      throw new HttpException(
        'Failed to verify email: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('clean-refresh-tokens')
  @UseGuards(JwtAuthGuard)
  async cleanExpiredTokens() {
    return await this.refreshTokenCleanupService.cleanupExpiredTokens();
  }
}
