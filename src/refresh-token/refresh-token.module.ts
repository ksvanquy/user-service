// src/refresh-token/refresh-token.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RefreshTokenCleanupService } from './refresh-token.cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])],
  providers: [RefreshTokenCleanupService],
})
export class RefreshTokenModule {}
