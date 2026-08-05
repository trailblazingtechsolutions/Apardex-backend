import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChangePasswordDto } from '../../user/dto/update-profile.dto';

export class UpdateAdminProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

// Admin password changes use the same contract and the same validation rules as
// every other account type — see UserService.changePassword.
export class ChangeAdminPasswordDto extends ChangePasswordDto {}
