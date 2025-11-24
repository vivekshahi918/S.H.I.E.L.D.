import { PassportSerializer } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  serializeUser(user: any, done: (err: any, user: any) => void): any {
    // console.log('🔹 SERIALIZER: Saving user to session ->', user.email); // Debug Log
    done(null, user);
  }

  deserializeUser(payload: any, done: (err: any, payload: string) => void): any {
    // console.log('🔸 DESERIALIZER: Reading user from session ->', payload.email); // Debug Log
    done(null, payload);
  }
}