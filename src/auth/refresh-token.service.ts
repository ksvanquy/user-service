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

  // Tạo refresh token cho người dùng
  async createRefreshToken(
    user: User,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const jti = crypto.randomBytes(16).toString('hex');  // Tạo id cho token
    const tokenHash = crypto.createHash('sha256').update(jti).digest('hex'); // Mã hóa token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token hết hạn sau 7 ngày

    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      jti,
      tokenHash,
      deviceName,
      ipAddress,
      userAgent,
      expiresAt,
      isRevoked: false,  // Chưa bị thu hồi
    });

    return this.refreshTokenRepository.save(refreshToken);  // Lưu vào DB
  }

  // Làm mới access token từ refresh token
  async refreshAccessToken(tokenHash: string): Promise<{ access_token: string }> {
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');  // Nếu không tìm thấy token
    }

    if (token.isRevoked || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');  // Nếu token đã hết hạn hoặc bị thu hồi
    }

    const payload = { email: token.user.email, sub: token.user.id };  // Payload cho access token mới
    return {
      access_token: this.jwtService.sign(payload),  // Tạo access token mới
    };
  }

  // Thu hồi refresh token
  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');  // Nếu không tìm thấy refresh token
    }

    refreshToken.isRevoked = true;  // Đánh dấu token là đã bị thu hồi
    refreshToken.revokedAt = new Date();  // Ghi lại thời gian thu hồi
    await this.refreshTokenRepository.save(refreshToken);  // Lưu thay đổi vào DB
  }
  // Xóa refresh token đã thu hồi
  async cleanRevokedTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({ isRevoked: true });
    return result.affected ?? 0;
  }
}
