import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { UsersService } from '@users/users.service';               // Alias @users -> src/users
import { User } from '@users/entities/user.entity';                        // Alias @entities -> src/entities
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';          // Alias @auth -> src/auth/guards
import { RolesGuard } from '@auth/guards/roles.guard';               // Alias @auth -> src/auth/guards
import { Roles } from '@auth/decorators/roles.decorator';


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
} 