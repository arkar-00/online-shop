import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;
}
