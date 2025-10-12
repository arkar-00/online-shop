import { Body, Controller, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private userService: UserService) {}

  @Post('signup')
  @ApiCreatedResponse({ type: User, description: 'User successfully created.' })
  @ApiConflictResponse({ description: 'Email address already exists.' })
  async signUp(@Body() userDTO: CreateUserDto): Promise<Omit<User, 'password'>> {
    return this.userService.createUser(userDTO);
  }
}
