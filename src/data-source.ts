import { DataSource } from 'typeorm';
import { User } from '@users/entities/user.entity';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { Role } from '@roles/entities/role.entity';
import { Permission } from '@permissions/entities/permission.entity';
import { UserToken } from '@user-token/entities/user-token.entity';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'user_service',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, UserProfile, RefreshToken, Role, Permission, UserToken],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});
