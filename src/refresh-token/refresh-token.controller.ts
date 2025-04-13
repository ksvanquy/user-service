import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('refresh-token')
export class RefreshTokenController {
  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      return await this.refreshTokenService.refreshAccessToken(
        refreshTokenDto.refreshToken,
      );
    } catch (error) {
      throw new HttpException(
        'Invalid refresh token: ' + error.message,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  async revokeToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      await this.refreshTokenService.revokeRefreshToken(
        refreshTokenDto.refreshToken,
      );
      return { message: 'Token revoked successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to revoke token: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
