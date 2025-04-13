import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { UserToken } from '@user-token/entities/user-token.entity';
import { UserTokenType } from '@user-token/enums/user-token-type.enum';
import { User } from '@users/entities/user.entity';
import * as crypto from 'crypto';
import { HashUtil } from '../common/utils/hash.util';

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
  ): Promise<{ token: string; userToken: UserToken }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await HashUtil.hash(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const userToken = this.userTokenRepository.create({
      userId,
      tokenHash,
      type,
      expiresAt,
      isRevoked: false,
    });

    const savedUserToken = await this.userTokenRepository.save(userToken);
    return { token, userToken: savedUserToken };
  }

  async validateToken(
    token: string,
    type: UserTokenType,
  ): Promise<UserToken | null> {
    // Find all non-revoked tokens of the specified type that haven't expired
    const userTokens = await this.userTokenRepository.find({
      where: {
        type,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    // Check each token hash
    for (const userToken of userTokens) {
      const isValid = await HashUtil.compare(token, userToken.tokenHash);
      if (isValid) {
        return userToken;
      }
    }

    return null;
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
    // Find all tokens with relations
    const userTokens = await this.userTokenRepository.find({
      relations: ['user'],
    });

    // Check each token hash
    for (const userToken of userTokens) {
      const isValid = await HashUtil.compare(token, userToken.tokenHash);
      if (isValid) {
        return userToken;
      }
    }

    return null;
  }

  async deleteToken(token: string): Promise<void> {
    const userToken = await this.findByToken(token);
    if (userToken) {
      await this.userTokenRepository.delete(userToken.id);
    }
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.userTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async createEmailVerificationToken(
    user: User,
    expiresIn: number,
  ): Promise<{ token: string; userToken: UserToken }> {
    return this.createToken(
      user.id,
      UserTokenType.EMAIL_VERIFICATION,
      expiresIn,
    );
  }

  async createPasswordResetToken(
    user: User,
    expiresIn: number,
  ): Promise<{ token: string; userToken: UserToken }> {
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
