// ===================================================================
// GARDEN WATERING DTOs
// ===================================================================
// Purpose: Data Transfer Objects for garden watering API
// Author: Smart Farming Team
// Date: February 11, 2026

import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * DTO for starting a garden watering session
 */
export class StartGardenWateringDto {
  @IsInt()
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @Max(180, { message: 'Duration cannot exceed 180 minutes (3 hours)' })
  durationMinutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}

/**
 * DTO for stopping a garden watering session
 */
export class StopGardenWateringDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}
