import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { UserToken } from '@user-token/entities/user-token.entity';
import { UserTokenType } from '@user-token/enums/user-token-type.enum';
import { User } from '@users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class UserTokenService {
  constructor(
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
  ) {}

  async createToken(
    userId: number,
    type: UserTokenType,
    expiresInHours: number = 24,
  ): Promise<UserToken> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const userToken = this.userTokenRepository.create({
      userId,
      token,
      tokenHash,
      type,
      expiresAt,
      isRevoked: false,
    });

    return this.userTokenRepository.save(userToken);
  }

  async validateToken(
    token: string,
    type: UserTokenType,
  ): Promise<UserToken | null> {
    const userToken = await this.userTokenRepository.findOne({
      where: {
        token,
        type,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!userToken) {
      return null;
    }

    return userToken;
  }

  async revokeToken(tokenId: number): Promise<void> {
    await this.userTokenRepository.update(tokenId, {
      isRevoked: true,
      revokedAt: new Date(),
    });
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.userTokenRepository.update(
      { userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
      },
    );
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.userTokenRepository
      .createQueryBuilder()
      .delete()
      .from(UserToken)
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  async findByToken(token: string): Promise<UserToken | null> {
    return this.userTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  async deleteToken(token: string): Promise<void> {
    await this.userTokenRepository.delete({ token });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.userTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async createEmailVerificationToken(
    user: User,
    expiresIn: number,
  ): Promise<UserToken> {
    return this.createToken(user.id, UserTokenType.EMAIL_VERIFICATION, expiresIn);
  }

  async createPasswordResetToken(
    user: User,
    expiresIn: number,
  ): Promise<UserToken> {
    return this.createToken(user.id, UserTokenType.PASSWORD_RESET, expiresIn);
  }

  async verifyEmailToken(token: string): Promise<User | null> {
    const userToken = await this.findByToken(token);
    if (
      userToken &&
      userToken.type === UserTokenType.EMAIL_VERIFICATION &&
      userToken.expiresAt > new Date()
    ) {
      await this.deleteToken(token);
      return userToken.user;
    }
    return null;
  }

  async verifyPasswordResetToken(token: string): Promise<User | null> {
    const userToken = await this.findByToken(token);
    if (
      userToken &&
      userToken.type === UserTokenType.PASSWORD_RESET &&
      userToken.expiresAt > new Date()
    ) {
      await this.deleteToken(token);
      return userToken.user;
    }
    return null;
  }
}
