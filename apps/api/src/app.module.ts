import { Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service.js';
import { DemoRecordsController } from './demo-records/demo-records.controller.js';
import { DemoRecordsService } from './demo-records/demo-records.service.js';
import { HealthController } from './health/health.controller.js';
@Module({
  controllers: [DemoRecordsController, HealthController],
  providers: [PrismaService, DemoRecordsService],
})
export class AppModule {}
