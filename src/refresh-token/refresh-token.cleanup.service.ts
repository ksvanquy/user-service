// src/refresh-token/refresh-token.cleanup.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { Cron, CronExpression } from '@nestjs/schedule'; // Import cron decorator

@Injectable()
export class RefreshTokenCleanupService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  // Cron job để dọn dẹp refresh token hết hạn mỗi ngày lúc 00:00
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens() {
    const expiredTokens = await this.refreshTokenRepository
      .createQueryBuilder('refresh_token')
      .where('refresh_token.expiresAt < :now', { now: new Date() })
      .andWhere('refresh_token.isRevoked = false')
      .getMany();

    if (expiredTokens.length > 0) {
      console.log(
        `Cleaning up ${expiredTokens.length} expired refresh tokens.`,
      );
      // Xóa các refresh token đã hết hạn
      await this.refreshTokenRepository.remove(expiredTokens);
    } else {
      console.log('No expired refresh tokens found.');
    }
  }
}
