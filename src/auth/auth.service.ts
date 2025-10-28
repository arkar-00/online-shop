import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ✅ SIGN UP
  async signUp(signUpDto: SignUpDto) {
    const { email, password, firstName, lastName } = signUpDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = this.usersService.generateVerificationCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 10);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
    });

    await this.emailService.sendVerificationEmail(email, verificationCode);

    return {
      message: 'Signup successful. Please check your email for verification code.',
      userId: user.id,
    };
  }

  // ✅ VERIFY EMAIL
  async verifyEmail(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (user.emailVerificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (new Date() > user.emailVerificationExpires) {
      throw new BadRequestException('Verification code expired');
    }

    await this.usersService.update(user.id, {
      isEmailVerified: true,
      emailVerificationCode: undefined, // ✅ Fixed
      emailVerificationExpires: undefined, // ✅ Fixed
    });

    return { message: 'Email verified successfully' };
  }

  // ✅ RESEND VERIFICATION CODE
  async resendVerificationCode(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationCode = this.usersService.generateVerificationCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 10);

    await this.usersService.update(user.id, {
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
    });

    await this.emailService.sendVerificationEmail(email, verificationCode);

    return { message: 'Verification code sent' };
  }

  // ✅ SIGN IN
  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.is2FAEnabled) {
      const twoFACode = this.usersService.generate2FACode();
      const twoFAExpires = new Date();
      twoFAExpires.setMinutes(twoFAExpires.getMinutes() + 5);

      await this.usersService.update(user.id, {
        twoFACode,
        twoFAExpires,
      });

      await this.emailService.send2FACode(email, twoFACode);

      return {
        message: '2FA code sent to your email',
        requires2FA: true,
      };
    }

    return this.generateTokens(user);
  }

  // ✅ VERIFY 2FA
  async verify2FA(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.is2FAEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    if (user.twoFACode !== code) {
      throw new BadRequestException('Invalid 2FA code');
    }

    if (new Date() > user.twoFAExpires) {
      throw new BadRequestException('2FA code expired');
    }

    await this.usersService.update(user.id, {
      twoFACode: undefined, // ✅ Fixed
      twoFAExpires: undefined, // ✅ Fixed
    });

    return this.generateTokens(user);
  }

  // ✅ FORGOT PASSWORD
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If email exists, reset link will be sent' };
    }

    const resetToken = this.jwtService.sign(
      { email: user.email },
      { secret: this.configService.get('JWT_SECRET'), expiresIn: '1h' },
    );

    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    await this.usersService.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'Password reset email sent' };
  }

  // ✅ RESET PASSWORD
  async resetPassword(token: string, newPassword: string) {
    let payload;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user || user.resetPasswordToken !== token) {
      throw new BadRequestException('Invalid token');
    }

    if (new Date() > user.resetPasswordExpires) {
      throw new BadRequestException('Token expired');
    }

    await this.usersService.updatePassword(user.id, newPassword);
    await this.usersService.update(user.id, {
      resetPasswordToken: undefined, // ✅ Fixed
      resetPasswordExpires: undefined, // ✅ Fixed
    });

    return { message: 'Password reset successful' };
  }

  // PRIVATE: Generate JWT tokens
  private async generateTokens(user: User) {
    const payload = { email: user.email, sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
    });

    await this.usersService.update(user.id, { refreshToken });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
