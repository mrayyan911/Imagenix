import { IsString, IsBoolean, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateExportDto {
  @IsString()
  @IsIn(['coco', 'yolo', 'voc'])
  format: string;

  @IsOptional()
  @IsBoolean()
  includeImages?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(['draft', 'approved', 'rejected'], { each: true })
  annotationStatus?: string[];
}
