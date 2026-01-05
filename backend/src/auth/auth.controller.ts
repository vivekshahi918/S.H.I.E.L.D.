import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth') 
export class AuthController {
  
  // 1. This starts the login process
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Passport automatically redirects to Google here
  }

  // 2. Google redirects back here
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // This forces the "Serializer" to run
    await new Promise<void>((resolve, reject) => {
      req.login(req.user, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    console.log('Login successful, saving session...');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    req.session.save(() => {
      res.redirect(`${frontendUrl}/dashboard?status=success`);
    });
  }
}
