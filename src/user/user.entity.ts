import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity()
export class User {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ example: 'John' })
  @Column()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Column()
  lastName: string;

  @ApiProperty({ example: '123 Main Street' })
  @Column()
  address: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column()
  password: string;
}
