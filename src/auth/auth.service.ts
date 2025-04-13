// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@users/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@users/users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '@mail/mail.service';
import { UserTokenService } from '@user-token/user-token.service';
import { UserTokenType } from '@user-token/enums/user-token-type.enum';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { v4 as uuidv4 } from 'uuid';
import { HashUtil } from '../common/utils/hash.util';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { Role } from '@roles/entities/role.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepo: Repository<UserProfile>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly userTokenService: UserTokenService,
    private readonly configService: ConfigService,
  ) {}

  async getUserById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async register(userData: RegisterUserDto) {
    const user = await this.usersService.register(userData);

    // Generate email verification token
    const { token } = await this.userTokenService.createToken(
      user.id,
      UserTokenType.EMAIL_VERIFICATION,
    );

    // Send verification email
    await this.mailService.sendEmailVerification(user.email, token);

    return {
      message:
        'Registration successful. Please check your email for verification.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await HashUtil.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      permissions: user.roles.flatMap((role) =>
        role.permissions.map((permission) => permission.name),
      ),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // Access token expires in 15 minutes
    });

    const refreshToken = await this.createRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken.jti,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles.map((role) => role.name),
      },
    };
  }

  private async createRefreshToken(userId: number): Promise<RefreshToken> {
    const jti = uuidv4();
    const tokenHash = await HashUtil.hash(jti);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Refresh token expires in 7 days

    const refreshToken = this.refreshTokenRepo.create({
      userId,
      jti,
      tokenHash,
      expiresAt,
      isRevoked: false,
    });

    return this.refreshTokenRepo.save(refreshToken);
  }

  async refreshTokens(refreshTokenString: string) {
    const refreshToken = await this.refreshTokenRepo.findOne({
      where: { jti: refreshTokenString },
      relations: ['user', 'user.roles', 'user.roles.permissions'],
    });

    if (
      !refreshToken ||
      refreshToken.isRevoked ||
      refreshToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const payload = {
      sub: refreshToken.user.id,
      email: refreshToken.user.email,
      roles: refreshToken.user.roles.map((role) => role.name),
      permissions: refreshToken.user.roles.flatMap((role) =>
        role.permissions.map((permission) => permission.name),
      ),
    };

    // Revoke the old refresh token
    refreshToken.isRevoked = true;
    await this.refreshTokenRepo.save(refreshToken);

    // Create new tokens
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const newRefreshToken = await this.createRefreshToken(refreshToken.user.id);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken.jti,
    };
  }

  async revokeRefreshToken(userId: number, refreshTokenString: string) {
    const refreshToken = await this.refreshTokenRepo.findOne({
      where: { userId, jti: refreshTokenString },
    });

    if (refreshToken) {
      refreshToken.isRevoked = true;
      await this.refreshTokenRepo.save(refreshToken);
    }
  }

  async logout(userId: number, refreshTokenString: string) {
    await this.revokeRefreshToken(userId, refreshTokenString);
    return { message: 'Logged out successfully' };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return {
        message:
          'If your email is registered, you will receive a password reset link.',
      };
    }

    const { token } = await this.userTokenService.createToken(
      user.id,
      UserTokenType.PASSWORD_RESET,
    );

    await this.mailService.sendPasswordResetEmail(user.email, token);

    return {
      message:
        'If your email is registered, you will receive a password reset link.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = await this.userTokenService.validateToken(
      dto.token,
      UserTokenType.PASSWORD_RESET,
    );

    if (!token) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.userRepo.findOne({ where: { id: token.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await HashUtil.hash(dto.newPassword);
    user.password = hashedPassword;
    await this.userRepo.save(user);

    // Revoke the reset token
    await this.userTokenService.revokeToken(token.id);

    // Revoke all refresh tokens for security
    await this.userTokenService.revokeAllUserTokens(user.id);

    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(token: string) {
    const verificationToken = await this.userTokenService.validateToken(
      token,
      UserTokenType.EMAIL_VERIFICATION,
    );

    if (!verificationToken) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const user = await this.userRepo.findOne({
      where: { id: verificationToken.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.emailVerified = true;
    await this.userRepo.save(user);

    // Revoke the verification token
    await this.userTokenService.revokeToken(verificationToken.id);

    return { message: 'Email verified successfully' };
  }

  async oauthLogin(user: any) {
    try {
      // Check if user exists
      let existingUser = await this.userRepo.findOne({
        where: { email: user.email },
        relations: ['roles'],
      });

      if (!existingUser) {
        // Create new user
        existingUser = this.userRepo.create({
          email: user.email,
          username: user.email.split('@')[0], // Use email prefix as username
          password: await HashUtil.hash(uuidv4()), // Generate random password
          emailVerified: true,
          isActive: true,
          provider: user.provider,
        });

        // Save the user first to get the ID
        existingUser = await this.userRepo.save(existingUser);

        // Create user profile
        const userProfile = this.userProfileRepo.create({
          userId: existingUser.id,
          fullName: user.name,
          avatarUrl: user.picture,
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
      throw new UnauthorizedException('OAuth authentication failed: ' + error.message);
    }
  }
}
