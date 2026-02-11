import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class StartFlushingDto {
  @IsInt()
  @Min(1, { message: 'Durasi minimal 1 menit' })
  @Max(180, { message: 'Durasi maksimal 180 menit (3 jam)' })
  durationMinutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;
}

export class StopFlushingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;
}
