import { IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator';

export class DeleteAnnotationsFromImagesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one image must be selected' })
  @IsString({ each: true })
  imageIds: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelClassIds?: string[];
}
