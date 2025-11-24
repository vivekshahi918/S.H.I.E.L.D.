import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { LogModule } from './log/log.module';

// AUTH imports (Path: ./auth/...)
import { AuthModule } from './auth/auth.module';
import { User, UserSchema } from './auth/user.schema'; // CHECK: is it 'user.schema' or 'schemas/user.schema'?
// If your user.schema.ts is directly inside 'src/auth', change line above to: './auth/user.schema'

// EMAIL imports (Path: ./email/...)
import { EmailController } from './email/email.controller';
import { EmailService } from './email/email.service';
import { Email, EmailSchema } from './email/email.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LogModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'), 
      }),
      inject: [ConfigService],
    }),

    // Register User Schema so EmailService can use it
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema },{ name: Email.name, schema: EmailSchema },]),

    AuthModule, 
  ],
  controllers: [EmailController], 
  providers: [EmailService],       
})
export class AppModule {}