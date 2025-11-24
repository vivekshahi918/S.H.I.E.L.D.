import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google } from 'googleapis';
import { Email } from './email.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoogleGenerativeAI } from '@google/generative-ai';
// Verify this path matches your folder structure (e.g., ../auth/schemas/user.schema)
import { User } from '../auth/user.schema'; 
import { encrypt, decrypt } from '../util/encryption';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectModel(Email.name) private emailModel: Model<Email>,
    @InjectModel(User.name) private userModel: Model<User>
  ) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  // === 1. HELPER: Sleep/Delay ===
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === 2. HELPER: Classification ===
  private classifyAttachment(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes('invoice') || lower.includes('receipt') || lower.includes('bill')) return 'Financial';
    if (lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.txt')) return 'Document';
    if (lower.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'Media';
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) return 'Data';
    return 'Other';
  }

  // === 3. MAIN SYNC LOGIC ===
  async fetchAndSaveEmailsFromGmail(user: any, limit = 5) {
    this.logger.log(`Starting Sync for ${user.email}...`);
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: limit, 
    });

    const messages = response.data.messages || [];
    
    for (const msg of messages) {
      if(!msg.id) continue;

      const exists = await this.emailModel.findOne({ gmailId: msg.id });
      
      // SELF-HEALING
      if (exists && exists.attachments.length > 0 && !exists.attachments[0]['id']) {
         await this.emailModel.deleteOne({ gmailId: msg.id });
      } else if (exists && exists.aiSummary && exists.aiSummary !== "Analysis unavailable.") {
        continue;
      }

      const fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const parsedEmail = await this.parseGmailMessage(fullMsg.data);

      // === PRE-PROCESS ATTACHMENTS ===
      let typedAttachments = parsedEmail.attachments.map((att: any) => ({
        name: att.name,
        id: att.id, 
        type: this.classifyAttachment(att.name)
      }));

      // === AI SECTION ===
      let aiResults = {
        summary: "Email too short for AI summary.",
        priority: "Medium",
        category: "Personal",
        topics: [],
        sentiment: "Neutral",
        attachmentTypes: [],
        isSensitive: false,
        sensitiveType: 'None'
      };

      if (parsedEmail.bodyText.length > 50) {
        console.log(`⏳ Waiting 4s before analyzing: ${parsedEmail.subject.substring(0, 20)}...`);
        await this.delay(4000); 

        aiResults = await this.generateAnalysis(parsedEmail.bodyText);
        
        if (aiResults.attachmentTypes && aiResults.attachmentTypes.length === typedAttachments.length) {
           typedAttachments = typedAttachments.map((att, index) => ({
             name: att.name,
             id: att.id,
             type: aiResults.attachmentTypes[index] || att.type
           }));
        }
      }

      // Merge AI Results
      Object.assign(parsedEmail, {
        aiSummary: aiResults.summary,
        priority: aiResults.priority,
        category: aiResults.category,
        topics: aiResults.topics,
        sentiment: aiResults.sentiment,
        isSensitive: aiResults.isSensitive || false,
        sensitiveType: aiResults.sensitiveType || 'None'
      });

      // === ENCRYPTION & SAVE ===
      const secureEmail = {
        ...parsedEmail,
        bodyText: encrypt(parsedEmail.bodyText),
        bodyHtml: encrypt(parsedEmail.bodyHtml),
        aiSummary: encrypt(parsedEmail['aiSummary'] || ''),
        attachments: typedAttachments 
      };

      await this.emailModel.findOneAndUpdate(
        { gmailId: parsedEmail.gmailId },
        secureEmail, 
        { upsert: true, new: true }
      );
      console.log(`✅ Saved (Encrypted): ${parsedEmail.subject}`);
    }

    return this.getAllEmailsFromDB();
  }

  // === 4. PARSER ===
  private async parseGmailMessage(data: any) {
    const headers = data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
    const sender = headers.find(h => h.name === 'From')?.value || 'Unknown';
    const dateStr = headers.find(h => h.name === 'Date')?.value;
    
    let bodyText = '';
    let bodyHtml = '';
    let attachments: any[] = [];

    const parseParts = (parts) => {
      if (!parts) return;
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } 
        else if (part.mimeType === 'text/html' && part.body.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } 
        else if (part.filename && part.filename.length > 0 && part.body.attachmentId) {
          attachments.push({ name: part.filename, id: part.body.attachmentId });
        }
        if (part.parts) parseParts(part.parts);
      }
    };
    parseParts(data.payload.parts || [data.payload]);

    return {
      gmailId: data.id,
      threadId: data.threadId,
      labelIds: data.labelIds,
      snippet: data.snippet,
      subject,
      sender,
      receivedDate: new Date(dateStr),
      bodyText: bodyText || data.snippet,
      bodyHtml,
      attachments,
      aiSummary: '', 
      priority: 'Medium', 
      category: 'General',
      topics: [],
      sentiment: 'Neutral',
      isSensitive: false,
      sensitiveType: 'None'
    };
  }

  // === 5. DOWNLOAD LOGIC ===
  async getAttachment(user: any, messageId: string, attachmentId: string, filename: string, res: any) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: user.accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId,
      });

      const data = response.data.data;
      if (!data) throw new NotFoundException('Attachment data is empty');
      const buffer = Buffer.from(data, 'base64');

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.send(buffer);
    } catch (error) {
      this.logger.error(`Failed to fetch attachment: ${error.message}`);
      throw new NotFoundException('Attachment not found');
    }
  }

  // === 6. AI GENERATOR ===
  private async generateAnalysis(text: string) {
    try {
      // Use 1.5-flash as it is the standard stable version
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
        Analyze this email. Return ONLY raw JSON.
        Keys: 
        -summary (string), 
        -priority (High/Medium/Low), 
        -category (Work/Personal/Finance/Promotions), 
        -topics (array of strings), 
        -sentiment (Positive/Neutral/Negative),
        -attachmentTypes (array of strings, corresponding to the filenames. Choose from: 'Financial', 'Document', 'Media', 'Data', 'Other')
        - isSensitive (boolean: true if email contains Credit Card numbers, API Keys, Passwords, or Govt IDs. Otherwise false.)
        - sensitiveType (string: Describe what was found, e.g. "Credit Card", "Password". If safe, return "None")
        Content: ${text.slice(0, 2000)}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();
      
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("AI Analysis Error:", error.message);
      return { 
        summary: "Analysis Failed", 
        priority: "Medium", 
        category: "Unknown", 
        topics: [], 
        sentiment: "Neutral",
        attachmentTypes: [],
        isSensitive: false,
        sensitiveType: 'None'
      };
    }
  }

  // === 7. ANALYTICS ===
  async getEmailStats() {
    const total = await this.emailModel.countDocuments({isDeleted: { $ne: true }});
    const normalizeStats = async (field: string) => {
      const rawStats = await this.emailModel.aggregate([
        { 
          $match: { isDeleted: { $ne: true } } 
        },
        { $group: { _id: { $toUpper: `$${field}` }, count: { $sum: 1 }, originalLabel: { $first: `$${field}` } } }
      ]);
      return rawStats.map(s => ({
        name: s._id ? s._id.charAt(0) + s._id.slice(1).toLowerCase() : 'Unknown', 
        value: s.count 
      }));
    };

    return {
      total,
      categories: await normalizeStats('category'),
      priorities: await normalizeStats('priority'),
      sentiments: await normalizeStats('sentiment'),
    };
  }

  // === 8. GET EMAILS ===
  async getAllEmailsFromDB() {
    const allEmails = await this.emailModel.find({ isDeleted: { $ne: true } })
      .sort({ receivedDate: -1 })
      .exec();
    
    return allEmails.map(email => {
      const e = email.toObject();
      return {
        ...e,
        bodyText: decrypt(e.bodyText),
        bodyHtml: decrypt(e.bodyHtml),
        aiSummary: decrypt(e.aiSummary)
      };
    });
  }

  // === 9. SEARCH FUNCTION ===
  async searchEmails(query: string) {
    const results = await this.emailModel.find(
      { $text: { $search: query }, isDeleted: { $ne: true } },
      { score: { $meta: 'textScore' } } 
    )
    .sort({ score: { $meta: 'textScore' } })
    .exec();

    return results.map(email => {
      const e = email.toObject();
      return {
        ...e,
        bodyText: decrypt(e.bodyText),
        bodyHtml: decrypt(e.bodyHtml),
        aiSummary: decrypt(e.aiSummary)
      };
    });
  }

  // === 10. NOISE REMOVER (Delete by Category) ===
  async deleteByCategory(category: string) {
    // FIXED SYNTAX HERE:
    const result = await this.emailModel.updateMany(
      { category: category, isDeleted: { $ne: true } }, // Filter
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date() 
        }
      } // Update Action
    );
    return { deletedCount: result.modifiedCount, message: `Moved ${result.modifiedCount} ${category} emails to trash` };
  }

  // === 11. RETENTION POLICY (Manual) ===
  async applyRetentionPolicy(days: number = 25) { 
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    // FIXED SYNTAX HERE:
    const result = await this.emailModel.updateMany(
      { 
        receivedDate: { $lt: thresholdDate },
        isDeleted: { $ne: true }
      }, // Filter
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date() 
        }
      } // Update Action
    );
    
    return { deletedCount: result.modifiedCount, message: `Archived ${result.modifiedCount} emails older than ${days} days` };
  }

  // === 12. AUTOMATED CRON JOBS ===
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoRetention() {
    this.logger.log('🧹 Running Auto-Retention Policy...');
    const result = await this.applyRetentionPolicy(60);
    if (result.deletedCount > 0) {
      this.logger.log(`Auto-Retention: Moved ${result.deletedCount} old emails to trash.`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async emptyTrashBin() {
    this.logger.log('🗑️ Running Permanent Trash Cleanup...');
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const result = await this.emailModel.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: sixtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      this.logger.log(`Permanently deleted ${result.deletedCount} emails from trash.`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    const user = await this.userModel.findOne();
    if (user && user.accessToken) {
       await this.fetchAndSaveEmailsFromGmail(user, 5);
    }
  }
}