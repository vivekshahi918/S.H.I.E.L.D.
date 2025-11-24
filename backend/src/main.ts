import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL, // Matches your Vercel URL
    ],
    credentials: true, // Required for cookies
  });

  // 1. Enable Sessions (This saves the user login state)
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'my-super-secret-key',
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        // Secure must be TRUE in production (https), FALSE in localhost
        secure: process.env.NODE_ENV === 'production', 
        // None is required for Cross-Site cookies (Vercel -> Render)
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      },
    }),
  );

  // 2. Initialize Passport Session
  app.use(passport.initialize());
  app.use(passport.session());

  // 3. Configure CORS (Allows Frontend to send the cookie)
  app.enableCors({
    // Allow Localhost OR your future Vercel URL
    origin: [
      'http://localhost:5173', 
      process.env.FRONTEND_URL // We will set this variable in Render later
    ],
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();