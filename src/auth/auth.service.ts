import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterUserDto): Promise<User> {
    const { username, email, password } = dto;

    const exists = await this.userRepo.findOne({
      where: [{ username }, { email }],
    });

    if (exists) {
      throw new ConflictException('Username or email already exists');
    }

    const hash = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      username,
      email,
      password: hash,
      isActive: true,
      emailVerified: false,
    });

    const saved = await this.userRepo.save(user);

    return plainToInstance(User, saved); // <--- đã loại bỏ password nhờ @Exclude
  }

  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { username } });

    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
