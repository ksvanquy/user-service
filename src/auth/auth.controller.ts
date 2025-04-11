import { Controller, Post, Body, Request, UseGuards, Req, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { User } from '../entities/user.entity';
import { RefreshTokenService } from './refresh-token.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Headers('user-agent') userAgent?: string, @Req() request?: any) {
    const result = await this.authService.login(req.user);
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      req.user,
      undefined,
      request?.ip,
      userAgent,
    );
    return {
      ...result,
      refresh_token: refreshToken.jti,
    };
  }

  @Post('register')
  async register(@Body() userData: RegisterUserDto) {
    return this.authService.register(userData);
  }

  @Post('refresh')
  async refreshToken(@Body('refresh_token') refreshToken: string) {
    return this.refreshTokenService.refreshAccessToken(refreshToken);
  }

  @Post('logout')
  async logout(@Body('refresh_token') refreshToken: string) {
    await this.refreshTokenService.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }
}
