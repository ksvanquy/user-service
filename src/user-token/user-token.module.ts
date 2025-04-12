import { Module } from '@nestjs/common';
import { UserTokenService } from '@user-token/user-token.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTokenController } from '@user-token/user-token.controller';
import { UserToken } from '@user-token/entities/user-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserToken])],
  controllers: [UserTokenController],
  providers: [UserTokenService],
  exports: [UserTokenService],
})
export class UserTokenModule {}
