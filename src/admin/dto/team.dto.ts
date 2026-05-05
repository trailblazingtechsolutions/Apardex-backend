import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../../user/user.entity';

export class InviteTeamMemberDto {
  @ApiProperty({ example: 'officer@apardex.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Sarah' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Jones' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ enum: AdminRole })
  @IsEnum(AdminRole)
  adminRole!: AdminRole;
}

export class UpdateTeamMemberRoleDto {
  @ApiProperty({ enum: AdminRole })
  @IsEnum(AdminRole)
  adminRole!: AdminRole;
}
