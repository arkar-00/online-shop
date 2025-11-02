import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class Verify2FADto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
