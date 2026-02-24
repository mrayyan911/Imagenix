import { IsString, IsArray, IsOptional, IsNumber, Min, Max, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ClassicalTransformDto {
  @IsString()
  @IsIn(['flip_horizontal', 'flip_vertical', 'rotate', 'brightness', 'contrast', 'saturation', 'blur', 'noise', 'crop', 'scale'])
  type: string;

  @IsOptional()
  @IsNumber()
  value?: number;
}

export class CreateClassicalAugmentationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassicalTransformDto)
  transforms: ClassicalTransformDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  multiplier?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageIds?: string[];

  @IsOptional()
  @IsBoolean()
  preserveOriginals?: boolean;
}

export class CreateGenerativeAugmentationDto {
  @IsString()
  @IsIn(['weather', 'lighting', 'background', 'style_transfer', 'object_variation'])
  variationType: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageIds?: string[];
}

export class CreateRandomAugmentationDto {
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  strength: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  seed?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  multiplier?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageIds?: string[];

  @IsOptional()
  @IsBoolean()
  preserveOriginals?: boolean;
}

export class PreviewRandomAugmentationDto {
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  strength: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  seed?: string;
}
