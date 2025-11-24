import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogController } from './log.controller';
import { LogService } from './log.service';
import { Log, LogSchema } from './log.schema';

@Global() // <--- Make it Global so EmailService can use it easily
@Module({
  imports: [MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }])],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService], // Export service to other modules
})
export class LogModule {}