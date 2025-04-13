// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '@users/entities/user.entity'; // Sử dụng alias @entities
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshTokenService } from '@refresh-token/refresh-token.service';

import { ScheduleModule } from '@nestjs/schedule';
import { RefreshTokenModule } from '@refresh-token/refresh-token.module';
import { RefreshTokenCleanupService } from '@refresh-token//refresh-token.cleanup.service'; // Import service dọn dẹp refresh token
import { UsersModule } from '@users/users.module';

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
    UsersModule,
    ScheduleModule.forRoot(), // Thêm ScheduleModule vào imports để sử dụng cron job
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenService,
    RefreshTokenCleanupService,
  ],
  controllers: [AuthController],
  exports: [AuthService, RefreshTokenService],
})
export class AuthModule {}
