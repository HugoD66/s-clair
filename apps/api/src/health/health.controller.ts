import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service.js';
import { ProblemDto } from '../common/problem.dto.js';
class HealthDto {
  @ApiProperty({ enum: ['ok'] }) status!: string;
}
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('live')
  @ApiOkResponse({ type: HealthDto })
  live(): HealthDto {
    return { status: 'ok' };
  }
  @Get('ready')
  @ApiOkResponse({ type: HealthDto })
  @ApiResponse({ status: 503, type: ProblemDto })
  async ready(): Promise<HealthDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ code: 'databaseUnavailable' });
    }
    return { status: 'ok' };
  }
}
