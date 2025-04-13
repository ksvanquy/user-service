// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '@auth/auth.service';
import { OAuthService } from '@auth/oauth.service';
import { AuthController } from '@auth/auth.controller';
import { LocalStrategy } from '@auth/strategies/local.strategy';
import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { GoogleStrategy } from '@auth/strategies/google.strategy';
import { FacebookStrategy } from '@auth/strategies/facebook.strategy';
import { User } from '@users/entities/user.entity';
import { UserToken } from '@user-token/entities/user-token.entity';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { Role } from '@roles/entities/role.entity';
import { UsersModule } from '@users/users.module';
import { MailModule } from '@mail/mail.module';
import { UserTokenModule } from '@user-token/user-token.module';
import { RefreshTokenModule } from '@refresh-token/refresh-token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserToken, RefreshToken, UserProfile, Role]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    MailModule,
    UserTokenModule,
    RefreshTokenModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
  ],
  exports: [AuthService, OAuthService],
})
export class AuthModule {}
