import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailNewHostRegistration?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailDisputesAndFlags?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailPlatformPayouts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailMarketingUpdates?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  pushDirectMessages?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  pushSystemAlerts?: boolean;
}
