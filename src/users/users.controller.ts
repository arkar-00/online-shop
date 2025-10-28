import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Toggle2FADto } from './dto/toggle-2fa.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const { password, refreshToken, ...result } = user;
    return result;
  }

  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const user = await this.usersService.update(req.user.userId, updateProfileDto);
    const { password, refreshToken, ...result } = user;
    return result;
  }

  @Patch('2fa')
  async toggle2FA(@Request() req, @Body() toggle2FADto: Toggle2FADto) {
    const user = await this.usersService.update(req.user.userId, {
      is2FAEnabled: toggle2FADto.enabled,
    });
    return {
      message: `2FA ${toggle2FADto.enabled ? 'enabled' : 'disabled'} successfully`,
      is2FAEnabled: user.is2FAEnabled,
    };
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  async getAllUsers() {
    return { message: 'This is admin only route - you can add logic here' };
  }
}