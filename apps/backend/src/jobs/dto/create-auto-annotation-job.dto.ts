import { IsString, IsNumber, IsOptional, IsArray, IsUUID, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateAutoAnnotationJobDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  className: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  imageIds?: string[];
}
