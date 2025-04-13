import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../src/users/entities/user.entity';
import { UserToken } from '../src/user-token/entities/user-token.entity';
import { Role } from '../src/roles/entities/role.entity';
import { Permission } from '../src/permissions/entities/permission.entity';
import { UserProfile } from '../src/user-profile/entities/user-profile.entity';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST'),
            port: configService.get('DB_PORT'),
            username: configService.get('DB_USERNAME'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE'),
            entities: [User, UserToken, Role, Permission, UserProfile],
            synchronize: true,
            dropSchema: true,
          }),
          inject: [ConfigService],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = moduleFixture.get<ConfigService>(ConfigService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Authentication Flow', () => {
    const testUser = {
      email: 'e2e@test.com',
      password: 'E2ETest123!',
      username: 'e2etestuser',
    };

    let accessToken: string;
    let verificationToken: string;
    let resetToken: string;

    it('should complete the registration process', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('message');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(testUser.email);

      // Step 2: Try to login before email verification (should fail)
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      // Step 3: Get verification token from database (in real scenario, this would be in email)
      const userToken = await app.get('UserTokenService').findOne({
        where: {
          user: { email: testUser.email },
          type: 'EMAIL_VERIFICATION',
        },
      });
      verificationToken = userToken.token;

      // Step 4: Verify email
      await request(app.getHttpServer())
        .get(`/auth/verify-email/${verificationToken}`)
        .expect(200);

      // Step 5: Login after email verification
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      accessToken = loginResponse.body.access_token;
    });

    it('should handle password reset flow', async () => {
      // Step 1: Request password reset
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: testUser.email })
        .expect(200);

      // Step 2: Get reset token from database (in real scenario, this would be in email)
      const resetTokenEntity = await app.get('UserTokenService').findOne({
        where: {
          user: { email: testUser.email },
          type: 'PASSWORD_RESET',
        },
      });
      resetToken = resetTokenEntity.token;

      // Step 3: Reset password
      const newPassword = 'NewPassword123!';
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200);

      // Step 4: Login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      accessToken = loginResponse.body.access_token;
    });

    it('should handle protected routes and token validation', async () => {
      // Step 1: Access protected route with valid token
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('id');
      expect(profileResponse.body.email).toBe(testUser.email);

      // Step 2: Try to access protected route with expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZXhwaXJlZEB0ZXN0LmNvbSIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      // Step 3: Try to access protected route with invalid token
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle role-based access control', async () => {
      // Step 1: Create a new role
      const adminRole = await app.get('RoleService').create({
        name: 'admin',
        description: 'Administrator role',
      });

      // Step 2: Assign role to user
      await app.get('UserService').addRole(testUser.email, adminRole.name);

      // Step 3: Login to get new token with role
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'NewPassword123!',
        })
        .expect(200);

      accessToken = loginResponse.body.access_token;

      // Step 4: Access admin-only route
      await request(app.getHttpServer())
        .get('/auth/admin-only')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
}); 