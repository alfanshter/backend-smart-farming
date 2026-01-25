/**
 * APPLICATION DTO - CreateScheduleDto
 */

import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ScheduleType } from '../../domain/entities/WateringSchedule';

export class CreateScheduleDto {
  @IsString()
  name: string;

  @IsString()
  deviceId: string;

  @IsEnum(ScheduleType)
  type: ScheduleType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  moistureThreshold?: number;

  @IsOptional()
  @IsArray()
  daysOfWeek?: number[];
}
