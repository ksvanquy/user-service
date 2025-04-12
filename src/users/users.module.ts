
// import { User, UserProfile, Role } from '../entities';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@users/entities/user.entity';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { Role } from '@roles/entities/role.entity';
import { UsersService } from '@users/users.service';                   // Alias @users -> src/users
import { UsersController } from '@users/users.controller';             // Alias @users -> src/users


@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, Role])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {} 