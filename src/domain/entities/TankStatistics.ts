export class TankStatistics {
  id: string;
  tankId: string;
  date: Date;
  totalUsage: number; // Total penggunaan air dalam liter
  totalFilled: number; // Total pengisian dalam liter
  averageLevel: number; // Rata-rata level dalam persen
  minLevel: number; // Level minimum hari ini
  maxLevel: number; // Level maximum hari ini
  autoFillCount: number; // Berapa kali auto fill triggered
  manualFillCount: number; // Berapa kali manual fill triggered
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<TankStatistics>) {
    Object.assign(this, partial);
  }
}
