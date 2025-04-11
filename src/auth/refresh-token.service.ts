import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createRefreshToken(user: User, deviceName?: string, ipAddress?: string, userAgent?: string): Promise<RefreshToken> {
    const jti = crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(jti).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      jti,
      tokenHash,
      deviceName,
      ipAddress,
      userAgent,
      expiresAt,
      isRevoked: false,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async refreshAccessToken(tokenHash: string): Promise<{ access_token: string }> {
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (token.isRevoked || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const payload = { email: token.user.email, sub: token.user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (refreshToken) {
      refreshToken.isRevoked = true;
      refreshToken.revokedAt = new Date();
      await this.refreshTokenRepository.save(refreshToken);
    }
  }
} 