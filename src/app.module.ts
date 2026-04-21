import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        autoLoadEntities: true,
        extra: {
          max: 5,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 3000,
        },
      }),
    }),
    AuthModule,
    UserModule,
    CloudinaryModule,
    MailerModule,
    PropertyModule,
    FavoritesModule,
    BookingModule,
    ReviewModule,
    MessagingModule,
    NotificationsModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
