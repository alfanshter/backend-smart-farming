/**
 * APPLICATION - Zone DTOs
 *
 * Penjelasan:
 * Data Transfer Objects untuk zone operations
 */

import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsNumber()
  @Min(0)
  @Max(60)
  durationMinutes: number;

  @IsNumber()
  @Min(0)
  @Max(59)
  durationSeconds: number;
}

export class UpdateZoneDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsNumber()
  @Min(0)
  @Max(60)
  @IsOptional()
  durationMinutes?: number;

  @IsNumber()
  @Min(0)
  @Max(59)
  @IsOptional()
  durationSeconds?: number;
}

export class ControlZoneDto {
  @IsString()
  @IsNotEmpty()
  zoneId: string;

  @IsBoolean()
  isActive: boolean;

  @IsNumber()
  @Min(0)
  @Max(60)
  @IsOptional()
  durationMinutes?: number;

  @IsNumber()
  @Min(0)
  @Max(59)
  @IsOptional()
  durationSeconds?: number;
}

export class ZoneStatusResponseDto {
  zoneId: string;
  name: string;
  isActive: boolean;
  totalDurationSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  startedAt?: Date;
  estimatedEndTime?: Date;
  message: string;
}
