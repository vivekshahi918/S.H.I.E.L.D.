import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { SessionSerializer } from './session.serializer'; 
import { PassportModule } from '@nestjs/passport'; // <--- Ensure this is imported

@Module({
  imports: [
    // ⬇️ THIS IS THE MISSING PIECE ⬇️
    PassportModule.register({ session: true }), 
    // ⬆️ We must explicitly tell Passport to use sessions ⬆️

    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    GoogleStrategy, 
    SessionSerializer 
  ], 
})
export class AuthModule {}