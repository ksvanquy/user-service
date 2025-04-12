import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from '@users/users.service';
import { User } from '@users/entities/user.entity';
import { CreateUserDto } from '@users/dto/create-user.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { ChangePasswordDto } from '@users/dto/change-password.dto';

@Controller('users')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /users
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    // console.log('Received CreateUserDto:', createUserDto);
    return await this.usersService.create(createUserDto);
  }

  // POST /users/register
  @Patch(':id')
  // @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<User>,
  ): Promise<User> {
    console.log('Update user id:', id);
    console.log('Update data:', updateUserDto);
    return this.usersService.update(+id, updateUserDto);
  }

  // POST /users/delete
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string): Promise<void> {
    // Tạo token reset password
    // Gửi email, bạn có thể trả về token hoặc lưu vào cơ sở dữ liệu nếu cần.
    return this.usersService.forgotPassword(email);
  }

  // POST /users/register
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post(':id/roles/:roleId')
  assignRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.usersService.assignRole(+id, +roleId);
  }

  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') userId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<string> {
    console.log('User ID:', userId);
    console.log('Change Password Payload:', changePasswordDto);

    return this.usersService.changePassword(userId, changePasswordDto);
  }
}
