import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/google/callback',  
      scope: ['email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.modify',   // Move emails (add/remove labels)
        'https://www.googleapis.com/auth/drive.file'] // For saving attachments to Drive],
    });
  }

  // ⬇️ THIS IS THE FIX. We force the parameters here. ⬇️
  authorizationParams(): { [key: string]: string } {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, photos } = profile;

    // Log to debug
    console.log('------------------------------------------------');
    console.log('Google Refresh Token Received:', refreshToken ? 'YES' : 'NO');
    console.log('------------------------------------------------');

    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
      refreshToken,
    };

    const savedUser = await this.authService.validateUser(user);
    done(null, savedUser);
  }
}