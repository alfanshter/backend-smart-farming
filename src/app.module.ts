import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SmartFarmingModule } from './SmartFarmingModule';
import { AuthModule } from './modules/AuthModule';
import { ZoneModule } from './modules/ZoneModule';
import { AutoDripModule } from './modules/AutoDripModule';
import { TankModule } from './modules/TankModule';
import { FlushingModule } from './modules/FlushingModule';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per minute
      },
    ]),
    SmartFarmingModule,
    AuthModule,
    ZoneModule,
    AutoDripModule,
    TankModule,
    FlushingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
