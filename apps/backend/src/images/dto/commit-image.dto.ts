import { IsString, IsNumber, IsOptional, MaxLength, Min, Max, Length } from 'class-validator';

export class CommitImageDto {
  @IsString()
  @MaxLength(400)
  fileKey: string;

  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(80)
  mimeType: string;

  @IsNumber()
  @Min(1)
  @Max(12000)
  width: number;

  @IsNumber()
  @Min(1)
  @Max(12000)
  height: number;

  @IsString()
  @Length(64, 64)
  sha256: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phash?: string;
}
