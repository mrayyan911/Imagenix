import { IsString, MaxLength } from 'class-validator';

export class GetUploadUrlDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(80)
  mimeType: string;
}
