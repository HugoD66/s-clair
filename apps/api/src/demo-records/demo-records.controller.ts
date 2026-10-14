import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DemoRecordsService } from './demo-records.service.js';
import { DemoRecordDto } from './demo-record.dto.js';
import { ProblemDto } from '../common/problem.dto.js';
@ApiTags('demo-records')
@Controller('demo-records')
export class DemoRecordsController {
  constructor(private readonly records: DemoRecordsService) {}
  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: DemoRecordDto })
  @ApiResponse({ status: 400, type: ProblemDto })
  @ApiResponse({ status: 404, type: ProblemDto })
  @ApiResponse({ status: 503, type: ProblemDto })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<DemoRecordDto> {
    return this.records.findOne(id);
  }
}
