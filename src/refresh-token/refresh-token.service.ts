import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { User } from '@users/entities/user.entity';
import * as crypto from 'crypto';
import { MoreThan } from 'typeorm';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  // Tạo refresh token cho người dùng
  // async createRefreshToken(
  //   user: User,
  //   deviceName?: string,
  //   ipAddress?: string,
  //   userAgent?: string,
  // ): Promise<RefreshToken> {
  //   const jti = crypto.randomBytes(16).toString('hex');  // Tạo id cho token
  //   const tokenHash = crypto.createHash('sha256').update(jti).digest('hex'); // Mã hóa token
  //   const expiresAt = new Date();
  //   expiresAt.setDate(expiresAt.getDate() + 7); // Token hết hạn sau 7 ngày

  //   const refreshToken = this.refreshTokenRepository.create({
  //     userId: user.id,
  //     jti,
  //     tokenHash,
  //     deviceName,
  //     ipAddress,
  //     userAgent,
  //     expiresAt,
  //     isRevoked: false,  // Chưa bị thu hồi
  //   });

  //   return this.refreshTokenRepository.save(refreshToken);  // Lưu vào DB
  // }
  async createRefreshToken(
    user: User,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const existing = await this.refreshTokenRepository.findOne({
      where: {
        userId: user.id,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
        userAgent: userAgent,
      },
    });

    if (existing) {
      return existing;
    }

    const jti = crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(jti).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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

  // Làm mới access token từ refresh token
  async refreshAccessToken(
    tokenHash: string,
  ): Promise<{ access_token: string }> {
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user', 'user.roles', 'user.roles.permissions'],
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (token.isRevoked || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const payload = {
      sub: token.user.id,
      email: token.user.email,
      roles: token.user.roles.map((role) => role.name),
      permissions: token.user.roles.flatMap((role) =>
        role.permissions.map((permission) => permission.name),
      ),
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // Thu hồi refresh token
  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    refreshToken.isRevoked = true;
    refreshToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(refreshToken);
  }
  // Xóa refresh token đã thu hồi
  async cleanRevokedTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      isRevoked: true,
    });
    return result.affected ?? 0;
  }
}
