import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdateTankDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  // Auto Fill Settings
  @IsOptional()
  @IsBoolean()
  autoFillEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  autoFillMinLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  autoFillMaxLevel?: number;

  // Manual Fill Settings
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  manualFillMaxLevel?: number;

  // Agitator Settings
  @IsOptional()
  @IsBoolean()
  agitatorEnabled?: boolean;
}
