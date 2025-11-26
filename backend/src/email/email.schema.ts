import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// 1. Update Attachment Schema
@Schema({ _id: false }) 
export class Attachment {
  @Prop()
  name: string;

  @Prop()
  type: string;

  @Prop() // <--- ADD THIS
  id: string; // The Gmail Attachment ID
}
export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

@Schema()
export class Email extends Document {
  // ... (Keep everything else exactly the same) ...
  @Prop({ required: true, unique: true })
  gmailId: string;

  @Prop()
  threadId: string;

  @Prop()
  labelIds: string[];

  @Prop()
  sender: string;

  @Prop()
  subject: string;

  @Prop()
  snippet: string;

  @Prop()
  bodyText: string;

  @Prop()
  bodyHtml: string;

  @Prop()
  receivedDate: Date;

  @Prop({ required: true, index: true }) 
  ownerEmail: string; 

  @Prop({ type: [AttachmentSchema] })
  attachments: Attachment[];

  @Prop()
  aiSummary: string;

  @Prop()
  sentiment: string;

  @Prop()
  priority: string;

  @Prop()
  category: string;
  
  @Prop()
  isSensitive: boolean;

  @Prop()
  sensitiveType: string;

  @Prop([String])
  topics: string[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date; 
}

export const EmailSchema = SchemaFactory.createForClass(Email);
EmailSchema.index({ subject: 'text', sender: 'text', topics: 'text', category: 'text' });