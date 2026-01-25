/**
 * APPLICATION DTO - CreateDeviceDto
 *
 * Penjelasan:
 * DTO (Data Transfer Object) digunakan untuk transfer data dari API.
 * Dilengkapi dengan validation menggunakan class-validator.
 */

import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { DeviceType } from '../../domain/entities/Device';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DeviceType)
  type: DeviceType;

  @IsString()
  @IsNotEmpty()
  mqttTopic: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
