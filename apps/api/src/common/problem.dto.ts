import { ApiProperty } from '@nestjs/swagger';
export class ProblemDto {
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() status!: number;
  @ApiProperty() detail!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ format: 'uuid' }) requestId!: string;
}
