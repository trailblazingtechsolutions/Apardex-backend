import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { HostPayoutMethod } from './entities/host-payout-method.entity';
import { HostPayout } from './entities/host-payout.entity';
import { HostPreferences } from './entities/host-preferences.entity';
import { HostDocument } from './entities/host-document.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { HostService } from './host.service';
import { HostController } from './host.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      HostPayoutMethod,
      HostPayout,
      HostPreferences,
      HostDocument,
    ]),
    CloudinaryModule,
  ],
  controllers: [HostController],
  providers: [HostService],
  exports: [HostService],
})
export class HostModule {}
