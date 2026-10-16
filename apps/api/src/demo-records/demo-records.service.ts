import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { DemoRecordDto } from './demo-record.dto.js';
@Injectable()
export class DemoRecordsService {
  constructor(private readonly prisma: PrismaService) {}
  async findOne(id: string): Promise<DemoRecordDto> {
    const record = await this.prisma.demoRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException({ code: 'demoRecordNotFound' });
    return record;
  }
}
