import { IsNumber, IsUUID, IsOptional, Min, IsIn } from 'class-validator';

export class UpdateAnnotationDto {
  @IsOptional()
  @IsUUID()
  labelClassId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  y?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  height?: number;

  @IsOptional()
  @IsIn(['draft', 'approved', 'rejected'])
  status?: string;
}
