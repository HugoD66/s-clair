import { ApiProperty } from '@nestjs/swagger';
export class DemoRecordDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ maxLength: 120 })
  label!: string;
}
