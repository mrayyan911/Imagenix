import { IsArray, IsUUID, IsIn, ArrayMinSize, ArrayMaxSize, IsString } from 'class-validator';

export class BulkUpdateAnnotationsDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  annotationIds: string[];

  @IsIn(['draft', 'approved', 'rejected'])
  status: string;
}
