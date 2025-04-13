// src/refresh-token/refresh-token.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { RefreshTokenCleanupService } from '@refresh-token/refresh-token.cleanup.service';
import { RefreshTokenService } from '@refresh-token/refresh-token.service';
import { RefreshTokenController } from './refresh-token.controller';
import { UsersModule } from '@users/users.module';
import { User } from '@users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, User]),
    UsersModule,
    JwtModule.register({}),
  ],
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService, RefreshTokenCleanupService],
  exports: [RefreshTokenService, RefreshTokenCleanupService],
})
export class RefreshTokenModule {}
