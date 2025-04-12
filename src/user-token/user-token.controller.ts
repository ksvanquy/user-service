import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('user-token')
export class UserTokenController {
  @Get(':id')
  getUserToken(@Param('id') id: string) {
    // Logic to retrieve a user token by ID
    return { id, token: 'sample-token' };
  }

  @Post()
  createUserToken(@Body() createTokenDto: { userId: string }) {
    // Logic to create a new user token
    return { userId: createTokenDto.userId, token: 'new-sample-token' };
  }
}
