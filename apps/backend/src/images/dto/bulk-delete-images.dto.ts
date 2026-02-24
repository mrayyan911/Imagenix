import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class BulkDeleteImagesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one image must be selected' })
  @IsString({ each: true })
  imageIds: string[];
}
