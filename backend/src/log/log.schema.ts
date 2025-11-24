import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // Automatically adds createdAt (Time)
export class Log extends Document {
  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  action: string; // e.g. "SEARCH", "EXPORT_PDF", "LOGIN"

  @Prop()
  details: string; // e.g. "Query: invoice", "File: resume.pdf"
  
  @Prop()
  ip: string; // Optional: Track IP address
}

export const LogSchema = SchemaFactory.createForClass(Log);