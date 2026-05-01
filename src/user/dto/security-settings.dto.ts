import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SecuritySettingsDto {
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isTwoFactorEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isLoginAlertsEnabled?: boolean;
}
