// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, RefreshToken } from '../entities';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshTokenService } from './refresh-token.service';

import { ScheduleModule } from '@nestjs/schedule';
import { RefreshTokenModule } from '@refresh-token/refresh-token.module';
import { RefreshTokenCleanupService } from '@refresh-token//refresh-token.cleanup.service'; // Import service dọn dẹp refresh token

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(), // Thêm ScheduleModule vào imports để sử dụng cron job
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenService,
    RefreshTokenCleanupService, // Thêm RefreshTokenCleanupService vào providers
  ],
  controllers: [AuthController],
  exports: [AuthService, RefreshTokenService],
})
export class AuthModule {}
