// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '@users/entities/user.entity';
import { UserToken } from '@user-token/entities/user-token.entity';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { UsersModule } from '@users/users.module';
import { MailModule } from '@mail/mail.module';
import { UserTokenModule } from '@user-token/user-token.module';
import { RefreshTokenModule } from '@refresh-token/refresh-token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserToken, RefreshToken]),
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
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
