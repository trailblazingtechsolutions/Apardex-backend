import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MailerModule } from './mailer/mailer.module';
import { PropertyModule } from './property/property.module';
import { FavoritesModule } from './favorites/favorites.module';
import { BookingModule } from './booking/booking.module';
import { ReviewModule } from './review/review.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentModule } from './payment/payment.module';
import { HostModule } from './host/host.module';
import { AdminModule } from './admin/admin.module';
import { DisputesModule } from './disputes/disputes.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        synchronize: config.get<string>('DB_SYNC') === 'true',
        autoLoadEntities: true,
        // Serverless Postgres (Neon) suspends idle compute and can take ~10-20s
        // to wake, so the first request after a quiet period was exceeding the
        // pool's connect timeout and surfacing as a 500.
        retryAttempts: 5,
        retryDelay: 3000,
        extra: {
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 45000,
          keepAlive: true,
        },
      }),
    }),
    AuthModule,
    UserModule,
    HostModule,
    CloudinaryModule,
    MailerModule,
    PropertyModule,
    FavoritesModule,
    BookingModule,
    ReviewModule,
    MessagingModule,
    NotificationsModule,
    PaymentModule,
    AdminModule,
    DisputesModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
