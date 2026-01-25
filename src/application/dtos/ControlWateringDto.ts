/**
 * APPLICATION DTO - ControlWateringDto
 */

import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';

export class ControlWateringDto {
  @IsString()
  deviceId: string;

  @IsEnum(['ON', 'OFF'])
  action: 'ON' | 'OFF';

  @IsOptional()
  @IsNumber()
  duration?: number;
}
