import { IsBoolean, IsNotEmpty } from 'class-validator';

export class Toggle2FADto {
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}