/**
 * DTO - UpdateAutoDripScheduleDto
 *
 * Penjelasan:
 * Data Transfer Object untuk update jadwal auto drip.
 * Semua field optional.
 */

import { IsString, IsBoolean, IsArray, ValidateNested, IsOptional, Matches, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeSlotDto {
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format (24-hour), e.g., 07:00 or 17:30',
  })
  startTime!: string;

  @IsInt()
  @Min(0)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  durationSeconds!: number;
}

export class UpdateAutoDripScheduleDto {
  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activeDays?: string[]; // ["monday", "wednesday", "friday"]
}
