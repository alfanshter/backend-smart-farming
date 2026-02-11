import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateTankDto {
  @IsString()
  @MaxLength(100, { message: 'Tank name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  deviceId: string; // Device untuk kontrol (pompa, agitator)

  @IsOptional()
  @IsString()
  sensorDeviceId?: string; // Device untuk sensor level (optional)

  @IsNumber()
  @Min(10, { message: 'Capacity must be at least 10 liters' })
  @Max(100000, { message: 'Capacity must not exceed 100,000 liters' })
  capacity: number; // Kapasitas dalam liter

  @IsNumber()
  @Min(0)
  @Max(100)
  currentLevel: number; // Level saat ini (0-100%)

  // Auto Fill Settings
  @IsOptional()
  @IsBoolean()
  autoFillEnabled?: boolean; // Default false

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(80, { message: 'Auto fill min level must not exceed 80%' })
  autoFillMinLevel?: number; // Default 30%

  @IsOptional()
  @IsNumber()
  @Min(50, { message: 'Auto fill max level must be at least 50%' })
  @Max(100)
  autoFillMaxLevel?: number; // Default 90%

  // Manual Fill Settings
  @IsOptional()
  @IsNumber()
  @Min(50, { message: 'Manual fill max level must be at least 50%' })
  @Max(100)
  manualFillMaxLevel?: number; // Default 95%

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Manual fill duration must be at least 1 minute' })
  @Max(180, { message: 'Manual fill duration must not exceed 180 minutes' })
  @ValidateIf((o) => !o.sensorDeviceId)
  manualFillDuration?: number; // Durasi pengisian manual (menit) - hanya untuk tandon tanpa sensor

  // Agitator Settings
  @IsOptional()
  @IsBoolean()
  agitatorEnabled?: boolean; // Default false
}
