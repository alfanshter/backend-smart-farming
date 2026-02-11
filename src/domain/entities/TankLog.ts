export enum TankLogType {
  AUTO_FILL_START = 'auto_fill_start',
  AUTO_FILL_STOP = 'auto_fill_stop',
  MANUAL_FILL_START = 'manual_fill_start',
  MANUAL_FILL_STOP = 'manual_fill_stop',
  AGITATOR_ON = 'agitator_on',
  AGITATOR_OFF = 'agitator_off',
  LEVEL_UPDATE = 'level_update',
  OVERFLOW_WARNING = 'overflow_warning',
}

export class TankLog {
  id: string;
  tankId: string;
  type: TankLogType;
  levelBefore: number;
  levelAfter: number;
  message: string;
  metadata?: any; // JSON data tambahan
  createdAt: Date;

  constructor(partial: Partial<TankLog>) {
    Object.assign(this, partial);
  }
}
