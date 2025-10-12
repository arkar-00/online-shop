import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(userDTO: CreateUserDto): Promise<Omit<User, 'password'>> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(userDTO.password, salt);

    const user = this.userRepository.create({
      email: userDTO.email,
      password: hashedPassword,
      firstName: userDTO.firstName,
      lastName: userDTO.lastName,
      address: userDTO.address,
      role: UserRole.USER,
    });

    try {
      const newUser = await this.userRepository.save(user);
      const { password, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Email address already exists.');
      }
      throw error;
    }
  }
}
