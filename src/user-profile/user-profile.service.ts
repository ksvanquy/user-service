import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  async findOne(userId: number): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    return profile;
  }

  async findOrCreate(userId: number): Promise<UserProfile> {
    try {
      return await this.findOne(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        const profile = this.userProfileRepository.create({ userId });
        return this.userProfileRepository.save(profile);
      }
      throw error;
    }
  }

  async update(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const profile = await this.findOne(userId);
    Object.assign(profile, updateProfileDto);
    return this.userProfileRepository.save(profile);
  }

  async verifyPhone(userId: number): Promise<UserProfile> {
    const profile = await this.findOne(userId);
    profile.isPhoneVerified = true;
    return this.userProfileRepository.save(profile);
  }
}
