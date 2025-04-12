import { Injectable, NotFoundException,ConflictException,UnauthorizedException  } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@users/entities/user.entity';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { Role } from '@roles/entities/role.entity';
import { RegisterUserDto } from '@users/dto/register-user.dto';
import { ChangePasswordDto } from '@users/dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}  

    // Chức năng đăng ký
    async register(userData: RegisterUserDto) {
      if (!userData.password) {
        throw new ConflictException('Password is required');
      }
  
      // Kiểm tra xem email đã tồn tại chưa
      const existingUser = await this.userRepository.findOne({ where: { email: userData.email } });
      if (existingUser) {
        throw new ConflictException('Email đã tồn tại');
      }
  
      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(userData.password, 10);
  
      // Tạo người dùng mới
      const user = this.userRepository.create({
        ...userData,
        password: hashedPassword,
      });
  
      // Lưu người dùng vào cơ sở dữ liệu
      await this.userRepository.save(user);
      const { password, ...result } = user;
      return result;
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

  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
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

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<string> {
    
    const user = await this.userRepository.findOne({ where: { id: userId } });
    console.log('User found:', user);
  
    if (!user) {
      throw new Error('User not found');
    }
  
      // Kiểm tra mật khẩu cũ (so sánh mật khẩu đã mã hóa)
  const isOldPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.password);

  if (!isOldPasswordValid) {
    throw new Error('Incorrect old password');
  }

  // Mã hóa mật khẩu mới
  const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

  // Cập nhật mật khẩu mới cho người dùng
  user.password = hashedNewPassword;
  await this.userRepository.save(user);

  return 'Password changed successfully';
  }

} 