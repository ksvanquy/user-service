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
} from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

@Controller('user-profile')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get()
  findOwn(@Request() req) {
    return this.userProfileService.findOrCreate(req.user.id);
  }

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.userProfileService.findOne(+userId);
  }

  @Patch()
  update(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.userProfileService.update(req.user.id, updateProfileDto);
  }

  @Post('verify-phone')
  verifyPhone(@Request() req) {
    return this.userProfileService.verifyPhone(req.user.id);
  }
}
