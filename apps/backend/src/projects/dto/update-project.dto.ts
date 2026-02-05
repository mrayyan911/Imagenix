import { IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['standard', 'restricted', 'sensitive'])
  domainPolicy?: string;
}
