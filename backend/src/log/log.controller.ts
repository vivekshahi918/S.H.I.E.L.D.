import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { LogService } from './log.service';

@Controller('logs')
export class LogController {
  constructor(private readonly logService: LogService) {}

  // Get History
  @Get()
  async getLogs(@Req() req) {
    if (!req.user) throw new UnauthorizedException();
    return this.logService.getLogs(req.user.email);
  }

  // Create Log (For Frontend actions like 'EXPORT_PDF')
  @Post()
  async createLog(@Req() req, @Body() body: { action: string, details: string }) {
    if (!req.user) throw new UnauthorizedException();
    // Simple IP extraction
    const ip = req.ip || req.connection.remoteAddress;
    return this.logService.createLog(req.user.email, body.action, body.details, ip as string);
  }
}