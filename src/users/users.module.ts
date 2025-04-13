// import { User, UserProfile, Role } from '../entities';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@users/entities/user.entity';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { Role } from '@roles/entities/role.entity';
import { UsersService } from '@users/users.service';
import { UsersController } from '@users/users.controller';
import { UserTokenModule } from '@user-token/user-token.module';
import { MailModule } from '@mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, Role]),
    UserTokenModule,
    MailModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService, TypeOrmModule.forFeature([User])],
})
export class UsersModule {}
