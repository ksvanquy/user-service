import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from '@users/entities/user.entity';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { Role } from '@roles/entities/role.entity';
import { Permission } from '@permissions/entities/permission.entity';
import { UserToken } from '@user-token/entities/user-token.entity';

import { AuthModule } from '@auth/auth.module';
import { UsersModule } from '@users/users.module';
import { RolesModule } from '@roles/roles.module';
import { PermissionsModule } from '@permissions/permissions.module';
import { MailModule } from './mail/mail.module';
import { RefreshTokenModule } from '@refresh-token/refresh-token.module';
import { UserProfileModule } from '@user-profile/user-profile.module';
import { UserTokenModule } from '@user-token/user-token.module';
import { GoogleStrategy } from '@auth/strategies/google.strategy';
import { FacebookStrategy } from '@auth/strategies/facebook.strategy';

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
      autoLoadEntities: true,
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
    MailModule,
    RefreshTokenModule,
    UserProfileModule,
    UserTokenModule,
  ],
  controllers: [AppController],
  providers: [AppService, GoogleStrategy, FacebookStrategy],
})
export class AppModule {}
