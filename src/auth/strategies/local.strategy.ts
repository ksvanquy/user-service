import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@auth/auth.service';  // Sử dụng alias @auth
import { User } from '@entities/user.entity';  // Sử dụng alias @entities


@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Đặt 'email' làm trường dùng để xác thực
      passwordField: 'password', // Đặt 'password' làm trường mật khẩu
    });
  }

  // Sử dụng email thay vì username để xác thực người dùng
  async validate(email: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
