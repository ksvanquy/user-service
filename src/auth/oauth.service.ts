import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@users/entities/user.entity';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { Role } from '@roles/entities/role.entity';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { v4 as uuidv4 } from 'uuid';
import { HashUtil } from '../common/utils/hash.util';

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepo: Repository<UserProfile>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  async loginWithGoogle(googleUser: any) {
    try {
      // Check if user exists
      let existingUser = await this.userRepo.findOne({
        where: { email: googleUser.email },
        relations: ['roles'],
      });

      if (!existingUser) {
        // Create new user
        existingUser = this.userRepo.create({
          email: googleUser.email,
          username: googleUser.email.split('@')[0], // Use email prefix as username
          password: await HashUtil.hash(uuidv4()), // Generate random password
          emailVerified: true,
          isActive: true,
          provider: 'google',
        });

        // Save the user first to get the ID
        existingUser = await this.userRepo.save(existingUser);

        // Create user profile
        const userProfile = this.userProfileRepo.create({
          userId: existingUser.id,
          fullName: googleUser.name,
          avatarUrl: googleUser.picture,
        });
        await this.userProfileRepo.save(userProfile);

        // Assign default role if needed
        const defaultRole = await this.roleRepo.findOne({
          where: { name: 'user' },
        });
        if (defaultRole) {
          existingUser.roles = [defaultRole];
          await this.userRepo.save(existingUser);
        }
      }

      // Generate tokens
      const payload = {
        sub: existingUser.id,
        email: existingUser.email,
        roles: existingUser.roles?.map((role) => role.name) || [],
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const refreshToken = await this.createRefreshToken(existingUser.id);

      return {
        access_token: accessToken,
        refresh_token: refreshToken.jti,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
          roles: existingUser.roles?.map((role) => role.name) || [],
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Google authentication failed: ' + error.message);
    }
  }

  private async createRefreshToken(userId: number): Promise<RefreshToken> {
    const refreshToken = this.refreshTokenRepo.create({
      userId,
      jti: uuidv4(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return this.refreshTokenRepo.save(refreshToken);
  }
} 