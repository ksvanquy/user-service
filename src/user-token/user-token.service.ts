import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  UserToken,
  UserTokenType,
} from '@user-token/entities/user-token.entity';
import { User } from '@users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class UserTokenService {
  constructor(
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
  ) {}

  async createToken(
    user: User,
    type: UserTokenType,
    expiresIn: number,
  ): Promise<UserToken> {
    const tokenHash = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn);

    const userToken = this.userTokenRepository.create({
      userId: user.id,
      type,
      tokenHash,
      expiresAt,
    });

    return this.userTokenRepository.save(userToken);
  }

  async findByTokenHash(tokenHash: string): Promise<UserToken | null> {
    return this.userTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
  }

  async deleteToken(tokenHash: string): Promise<void> {
    await this.userTokenRepository.delete({ tokenHash });
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
    return this.createToken(user, UserTokenType.EMAIL_VERIFICATION, expiresIn);
  }

  async createPasswordResetToken(
    user: User,
    expiresIn: number,
  ): Promise<UserToken> {
    return this.createToken(user, UserTokenType.PASSWORD_RESET, expiresIn);
  }

  async verifyEmailToken(tokenHash: string): Promise<User | null> {
    const token = await this.findByTokenHash(tokenHash);
    if (
      token &&
      token.type === UserTokenType.EMAIL_VERIFICATION &&
      token.expiresAt > new Date()
    ) {
      await this.deleteToken(tokenHash);
      return token.user;
    }
    return null;
  }

  async verifyPasswordResetToken(tokenHash: string): Promise<User | null> {
    const token = await this.findByTokenHash(tokenHash);
    if (
      token &&
      token.type === UserTokenType.PASSWORD_RESET &&
      token.expiresAt > new Date()
    ) {
      await this.deleteToken(tokenHash);
      return token.user;
    }
    return null;
  }
}
