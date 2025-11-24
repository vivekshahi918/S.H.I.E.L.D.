import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log } from './log.schema';

@Injectable()
export class LogService {
  constructor(@InjectModel(Log.name) private logModel: Model<Log>) {}

  // 1. Create a Log Entry
  async createLog(userEmail: string, action: string, details: string = '', ip: string = '') {
    const newLog = new this.logModel({ userEmail, action, details, ip });
    await newLog.save();
  }

  // 2. Get All Logs (Sorted by Newest)
  async getLogs(userEmail: string) {
    return this.logModel.find({ userEmail }).sort({ createdAt: -1 }).limit(50).exec();
  }
}