import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateLabelClassDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'colorHex must be a valid hex color (e.g., #3B82F6)',
  })
  colorHex?: string;
}
