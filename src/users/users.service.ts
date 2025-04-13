import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@users/entities/user.entity';
import { Role } from '@roles/entities/role.entity';
import { UserTokenService } from '@user-token/user-token.service';
import { MailService } from '@mail/mail.service';
import { RegisterUserDto } from '@users/dto/register-user.dto';
import { CreateUserDto } from '@users/dto/create-user.dto';
import { ChangePasswordDto } from '@users/dto/change-password.dto';
import { HashUtil } from '../common/utils/hash.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly userTokenService: UserTokenService,
  ) {}

  // Chức năng đăng ký
  async register(userData: RegisterUserDto) {
    if (!userData.password) {
      throw new ConflictException('Password is required');
    }

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    // Mã hóa mật khẩu
    const hashedPassword = await HashUtil.hash(userData.password);

    // Tạo người dùng mới
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    // Lưu người dùng vào cơ sở dữ liệu
    await this.userRepository.save(user);
    const { ...result } = user;
    return result;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const exists = await this.userRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });
    if (exists) throw new ConflictException('User already exists');

    const userWithEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (userWithEmail) {
      throw new ConflictException('Email is already taken');
    }
    const hashedPassword = await HashUtil.hash(createUserDto.password);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    const savedUser = await this.userRepository.save(user);

    // Tạo token xác minh email
    const { token } = await this.userTokenService.createEmailVerificationToken(
      savedUser,
      3600,
    );
    console.log('Email verification token:', token);
    // Gửi email xác minh (bạn có thể sử dụng một dịch vụ gửi email ở đây)
    await this.mailService.sendEmailVerification(savedUser.email, token);
    // Ghi log hoặc thực hiện hành động khác nếu cần
    return savedUser;
  }

  async update(id: number, updateUserDto: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    // Hash password nếu có
    if (updateUserDto.password) {
      updateUserDto.password = await HashUtil.hash(updateUserDto.password);
    }

    // Gộp thông tin cũ với thông tin mới
    const updated = Object.assign(user, updateUserDto);
    return this.userRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const isMatch = await HashUtil.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    user.password = await HashUtil.hash(dto.newPassword);
    await this.userRepository.save(user);

    return 'Password changed successfully';
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    console.log('Password reset token is working');
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['profile', 'roles'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile', 'roles'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile', 'roles'],
    });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async assignRole(userId: number, roleId: number): Promise<User> {
    const user = await this.findOne(userId);
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }
    user.roles = [...(user.roles || []), role];
    return this.userRepository.save(user);
  }
}
