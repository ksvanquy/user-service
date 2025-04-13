import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { UserTokenService } from './user-token.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { UserTokenType } from './enums/user-token-type.enum';

@Controller('user-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UserTokenController {
  constructor(private readonly userTokenService: UserTokenService) {}

  @Get('cleanup')
  async cleanupExpiredTokens() {
    const count = await this.userTokenService.cleanupExpiredTokens();
    return { message: `Cleaned up ${count} expired tokens` };
  }

  @Post('revoke/:userId')
  async revokeAllUserTokens(@Param('userId') userId: string) {
    await this.userTokenService.revokeAllUserTokens(+userId);
    return { message: 'All tokens revoked successfully' };
  }

  @Delete(':token')
  async deleteToken(@Param('token') token: string) {
    await this.userTokenService.deleteToken(token);
    return { message: 'Token deleted successfully' };
  }
}
