// src/auth/strategies/local.strategy.ts

import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

    console.log("Email: ", email); // Debug giá trị email
    console.log("Password: ", password); // Debug giá trị password
    
    if (!email) {
      throw new BadRequestException('Email không được để trống');
    }
    if (!password) {
      throw new BadRequestException('Mật khẩu không được để trống');
    }

    // Gọi AuthService để kiểm tra người dùng
    const user = await this.authService.validateUser(email, password);
    
    // Nếu không tìm thấy người dùng hoặc mật khẩu không đúng, ném lỗi UnauthorizedException
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }
    
    return user;
  }
}
