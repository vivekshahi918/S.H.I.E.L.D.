import { Controller, Get, Post, Req, Res, Param, Delete, Query, Body, UnauthorizedException } from '@nestjs/common';
import { EmailService } from './email.service';
import { LogService } from '../log/log.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService, private readonly logService: LogService) {}

  // 1. FAST ROUTE: Just get data from DB (For Auto-Refresh)
  @Get('messages')
  async getMessages(@Req() req) {
    if (!req.user) throw new UnauthorizedException();
    return this.emailService.getAllEmailsFromDB();
  }

  // 2. SLOW ROUTE: Actually Connect to Gmail (For Manual Sync Button)
  @Post('sync') 
  async syncMessages(@Req() req, @Body() body: { isUserAction: boolean }) {
    if (!req.user) throw new UnauthorizedException();
    console.log("Manual Sync triggered for:", req.user.email);
    
    if (body && body.isUserAction) {
       await this.logService.createLog(req.user.email, 'SYNC_GMAIL', 'Manual Sync Triggered');
    }
    await this.emailService.fetchAndSaveEmailsFromGmail(req.user); 
    return this.emailService.getAllEmailsFromDB();
  }

  // 3. ANALYTICS ROUTE
  @Get('stats')
  async getStats(@Req() req) {
    if (!req.user) throw new UnauthorizedException();
    return this.emailService.getEmailStats();
  }

  // 4. DOWNLOAD ATTACHMENT ROUTE (New)
  @Get(':msgId/attachment/:attId')
  async downloadAttachment(
    @Req() req, 
    @Param('msgId') msgId: string, 
    @Param('attId') attId: string,
    @Query('filename') filename: string,
    @Res() res
  ) {
    if (!req.user) throw new UnauthorizedException();
    await this.logService.createLog(req.user.email, 'DOWNLOAD_ATTACHMENT', `File: ${filename}`);
    return this.emailService.getAttachment(req.user, msgId, attId, filename, res);
  }
  @Get('search')
  async search(@Req() req, @Query('q') query: string) {
    if (!req.user) throw new UnauthorizedException();
    if(query) await this.logService.createLog(req.user.email, 'SEARCH', `Query: ${query}`);
    if (!query) return this.emailService.getAllEmailsFromDB(); // Return all if empty
    return this.emailService.searchEmails(query);
  }

  @Delete('cleanup/category')
  async cleanCategory(@Req() req, @Query('category') category: string) {
    if (!req.user) throw new UnauthorizedException();
    
    // 📜 LOG IT
    await this.logService.createLog(req.user.email, 'CLEANUP', `Deleted all ${category} emails`);
    
    return this.emailService.deleteByCategory(category);
  }

  @Delete('cleanup/retention')
  async runRetention(@Req() req, @Query('days') days: string) {
    if (!req.user) throw new UnauthorizedException();
    
    // 📜 LOG IT
    await this.logService.createLog(req.user.email, 'RETENTION_RUN', `Deleted emails older than ${days} days`);
    
    return this.emailService.applyRetentionPolicy(Number(days));
  }
}