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
import * as bcrypt from 'bcrypt';
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    const verificationToken = await this.userTokenService.createToken(
      user.id,
      UserTokenType.EMAIL_VERIFICATION,
    );

    // Send verification email
    await this.mailService.sendEmailVerification(
      user.email,
      verificationToken.token,
    );

    return {
      message: 'Registration successful. Please check your email for verification.',
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
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
      roles: user.roles.map(role => role.name),
      permissions: user.roles.flatMap(role => 
        role.permissions.map(permission => permission.name)
      ),
    };

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: '15m', // Access token expires in 15 minutes
      }),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles.map(role => role.name),
      },
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return { message: 'If your email is registered, you will receive a password reset link.' };
    }

    const resetToken = await this.userTokenService.createToken(
      user.id,
      UserTokenType.PASSWORD_RESET,
    );

    await this.mailService.sendPasswordResetEmail(
      user.email,
      resetToken.token,
    );

    return { message: 'If your email is registered, you will receive a password reset link.' };
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
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
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

    const user = await this.userRepo.findOne({ where: { id: verificationToken.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.emailVerified = true;
    await this.userRepo.save(user);

    // Revoke the verification token
    await this.userTokenService.revokeToken(verificationToken.id);

    return { message: 'Email verified successfully' };
  }
}
