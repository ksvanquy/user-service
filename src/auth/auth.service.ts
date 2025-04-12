// src/auth/auth.service.ts
import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { UsersService } from '@users/users.service';
import { RegisterUserDto } from '@users/dto/register-user.dto';



@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,  // Inject UsersService để sử dụng chức năng đăng ký
  ) { }

    // Đăng ký (chuyển logic từ auth service sang users service)
    async register(userData: RegisterUserDto) {
      return this.usersService.register(userData);  // Gọi đến phương thức register trong UsersService
    }

   // Kiểm tra email và password trong cơ sở dữ liệu
   async validateUser(email: string, password: string): Promise<any> {
    if (!email || !password) {
      throw new BadRequestException('Email và mật khẩu không được để trống');
    }

    const user = await this.userRepo.findOne({ where: { email } });
    
    // Nếu người dùng không tồn tại
    if (!user) {
      throw new UnauthorizedException('Email không tồn tại');
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu không đúng');
    }

    // Trả về thông tin người dùng (không bao gồm mật khẩu)
    const { password: _, ...result } = user;
    return result;
  }

  // Đăng nhập và tạo token JWT
  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
