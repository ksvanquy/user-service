import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@users/users.service';               // Alias @users -> src/users
import { User } from '@users/entities/user.entity';                        // Alias @entities -> src/entities
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';          // Alias @auth -> src/auth/guards
import { RolesGuard } from '@auth/guards/roles.guard';               // Alias @auth -> src/auth/guards
import { Roles } from '@auth/decorators/roles.decorator';
import { ChangePasswordDto } from '@users/dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';


@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateUserDto: Partial<User>) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post(':id/roles/:roleId')
  @Roles('admin')
  assignRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.usersService.assignRole(+id, +roleId);
  }
  
  // @Patch(':id/change-password')
  // // @UseGuards(AuthGuard('jwt'))
  // async changePassword(
  //   @Param('id') userId: number,
  //   @Body() changePasswordDto: ChangePasswordDto,
  //   @Request() req,
  // ): Promise<string> {

  //   // console.log('Request body:', changePasswordDto);
  //   console.log('Logged in user:', req.user);  // // In ra thông tin người dùng đăng nhập
  //   const loggedInUserId = req.user.userId;  // Lấy userId từ req.user
  //   console.log('User ID in URL:', userId);  // In ra userId trong URL
  
  //   // if (userId !== loggedInUserId) {
  //   //   throw new UnauthorizedException('You are not authorized to change this user\'s password');
  //   // }
  
  //   return this.usersService.changePassword(userId, changePasswordDto);
  // }

  @Patch(':id/change-password')
  async changePassword(
    @Param('id') userId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<string> {
    // Lấy thông tin userId từ URL, không cần kiểm tra qua JWT
    console.log('User ID from URL:', userId);  // In ra userId từ URL
    console.log('Change Password Data:', changePasswordDto); // In ra thông tin đổi mật khẩu

    // Giả sử bạn có logic thay đổi mật khẩu cho người dùng dựa trên userId
    return this.usersService.changePassword(userId, changePasswordDto);
  }

} 