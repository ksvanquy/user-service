import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  User,
  UserProfile,
  Role,
  Permission,
  RefreshToken,
  UserToken,
} from '@entities/index';
import { AuthModule } from '@auth/auth.module';
import { UsersModule } from '@users/users.module';
import { RolesModule } from '@roles/roles.module';
import { PermissionsModule } from '@permissions/permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'user_service_db',
      entities: [User, UserProfile, Role, Permission, RefreshToken, UserToken],
      synchronize: process.env.NODE_ENV !== 'production', // Disable in production
    }),
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      Role,
      Permission,
      RefreshToken,
      UserToken,
    ]),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
