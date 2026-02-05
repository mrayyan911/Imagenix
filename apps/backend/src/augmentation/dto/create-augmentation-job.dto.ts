import { IsString, IsArray, IsOptional, IsNumber, Min, Max, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ClassicalTransformDto {
  @IsString()
  @IsIn(['flip_horizontal', 'flip_vertical', 'rotate', 'brightness', 'contrast', 'saturation', 'blur', 'noise', 'crop', 'scale'])
  type: string;

  @IsOptional()
  @IsNumber()
  value?: number; // e.g., rotation degrees, brightness factor
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
  multiplier?: number; // How many augmented copies per image (default: 1)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageIds?: string[]; // Specific images, or all if not provided

  @IsOptional()
  @IsBoolean()
  preserveOriginals?: boolean; // Keep original images (default: true)
}

export class CreateGenerativeAugmentationDto {
  @IsString()
  @IsIn(['weather', 'lighting', 'background', 'style_transfer', 'object_variation'])
  variationType: string;

  @IsOptional()
  @IsString()
  prompt?: string; // Additional prompt for generation

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quantity?: number; // Images to generate per source (default: 1)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageIds?: string[]; // Source images
}
