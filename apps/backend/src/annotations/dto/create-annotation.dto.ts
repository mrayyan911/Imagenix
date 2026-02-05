import { IsString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateAnnotationDto {
  @IsUUID()
  labelClassId: string;

  @IsNumber()
  @Min(0)
  x: number;

  @IsNumber()
  @Min(0)
  y: number;

  @IsNumber()
  @Min(2)
  width: number;

  @IsNumber()
  @Min(2)
  height: number;
}
