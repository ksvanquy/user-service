// src/auth/auth.controller.ts
import { Controller, Post, Body, Request, UseGuards, Req, Headers, HttpException, HttpStatus, Get  } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { User } from '../entities/user.entity';
import { RefreshTokenService } from './refresh-token.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RefreshTokenCleanupService } from '@refresh-token/refresh-token.cleanup.service';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly refreshTokenCleanupService: RefreshTokenCleanupService, // Inject RefreshTokenCleanupService
  ) {}

  // Endpoint thử nghiệm để gọi hàm dọn dẹp thủ công
  @Get('clean-refresh-tokens')
  async cleanExpiredTokens() {
    return await this.refreshTokenCleanupService.cleanupExpiredTokens(); // Sửa tên phương thức ở đây
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Headers('user-agent') userAgent?: string, @Req() request?: any) {
    try {
      const result = await this.authService.login(req.user); // Lấy JWT từ AuthService
      const refreshToken = await this.refreshTokenService.createRefreshToken(
        req.user, 
        undefined, 
        request?.ip, 
        userAgent
      );
      
      return {
        access_token: result.access_token, // Trả về JWT Access Token
        refresh_token: refreshToken.jti,  // Trả về Refresh Token
      };
    } catch (error) {
      throw new HttpException('Login failed: ' + error.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('register')
  async register(@Body() userData: RegisterUserDto) {
    try {
      return await this.authService.register(userData);  // Đăng ký người dùng mới
    } catch (error) {
      throw new HttpException('Registration failed: ' + error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('refresh')
  async refreshToken(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new HttpException('Refresh token is required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.refreshTokenService.refreshAccessToken(refreshToken); // Lấy Access Token mới từ Refresh Token
    } catch (error) {
      throw new HttpException('Refresh token invalid or expired: ' + error.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('logout')
  async logout(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new HttpException('Refresh token is required', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.refreshTokenService.revokeRefreshToken(refreshToken); // Hủy refresh token
      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new HttpException('Failed to logout: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
