import { IsArray, IsUUID, IsIn, ArrayMinSize } from 'class-validator';

export class BulkUpdateAnnotationsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  annotationIds: string[];

  @IsIn(['draft', 'approved', 'rejected'])
  status: string;
}
