import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum TankControlAction {
  AGITATOR_ON = 'agitator_on',
  AGITATOR_OFF = 'agitator_off',
  MANUAL_FILL_START = 'manual_fill_start',
  MANUAL_FILL_STOP = 'manual_fill_stop',
  AUTO_FILL_START = 'auto_fill_start',
  AUTO_FILL_STOP = 'auto_fill_stop',
}

export class TankControlDto {
  @IsString()
  tankId: string;

  @IsEnum(TankControlAction)
  action: TankControlAction;

  @IsOptional()
  @IsBoolean()
  force?: boolean; // Force action meskipun ada kondisi yang tidak sesuai

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  durationMinutes?: number; // Durasi pompa untuk manual fill (dalam menit), opsional
}
