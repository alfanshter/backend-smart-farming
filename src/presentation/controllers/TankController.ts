import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { UserRole } from '../../domain/entities/User';
import { TankControlUseCase } from '../../domain/use-cases/TankControlUseCase';
import { CreateTankDto } from '../../application/dtos/CreateTankDto';
import { UpdateTankDto } from '../../application/dtos/UpdateTankDto';
import { TankControlDto } from '../../application/dtos/TankControlDto';

@Controller('tanks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TankController {
  constructor(private readonly tankControlUseCase: TankControlUseCase) {}

  // ===== TANK CRUD =====
  @Post()
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async createTank(@Request() req: any, @Body() createTankDto: CreateTankDto) {
    const userId = req.user.userId;
    const tank = await this.tankControlUseCase.createTank(userId, createTankDto);
    return {
      success: true,
      message: 'Tank created successfully',
      data: tank,
    };
  }

  @Get()
  async getAllTanks(@Request() req: any, @Query('all') all?: string) {
    // If user is admin and ?all=true, return all tanks
    // Otherwise return only user's tanks
    const userId = req.user.role === 'admin' && all === 'true' ? undefined : req.user.userId;
    const tanks = await this.tankControlUseCase.getAllTanks(userId);
    return {
      success: true,
      message: 'Tanks retrieved successfully',
      data: tanks,
      count: tanks.length,
    };
  }

  @Get('my')
  async getMyTanks(@Request() req: any) {
    const tanks = await this.tankControlUseCase.getAllTanks(req.user.userId);
    return {
      success: true,
      message: 'Tanks retrieved successfully',
      data: tanks,
      count: tanks.length,
    };
  }

  @Get(':id')
  async getTankById(@Param('id') id: string) {
    const tank = await this.tankControlUseCase.getTankById(id);
    return {
      success: true,
      message: 'Tank retrieved successfully',
      data: tank,
    };
  }

  @Get(':id/status')
  async getTankStatus(@Param('id') id: string) {
    const status = await this.tankControlUseCase.getTankStatus(id);
    return {
      success: true,
      message: 'Tank status retrieved successfully',
      data: status,
    };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async updateTank(@Param('id') id: string, @Body() updateTankDto: UpdateTankDto) {
    const tank = await this.tankControlUseCase.updateTank(id, updateTankDto);
    return {
      success: true,
      message: 'Tank updated successfully',
      data: tank,
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async deleteTank(@Param('id') id: string) {
    await this.tankControlUseCase.deleteTank(id);
    return {
      success: true,
      message: 'Tank deleted successfully',
      data: null,
    };
  }

  // ===== CONTROL ENDPOINTS =====
  @Post('control')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async controlTank(@Body() controlDto: TankControlDto) {
    const { tankId, action, durationMinutes } = controlDto;
    let result;

    switch (action) {
      case 'agitator_on':
        result = await this.tankControlUseCase.controlAgitator(tankId, true);
        break;
      case 'agitator_off':
        result = await this.tankControlUseCase.controlAgitator(tankId, false);
        break;
      case 'manual_fill_start':
        result = await this.tankControlUseCase.startManualFill(
          tankId,
          durationMinutes,
        );
        break;
      case 'manual_fill_stop':
        result = await this.tankControlUseCase.stopManualFill(tankId);
        break;
      case 'auto_fill_start':
        result = await this.tankControlUseCase.checkAndTriggerAutoFill();
        break;
      case 'auto_fill_stop':
        result = await this.tankControlUseCase.stopAutoFill(tankId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      success: true,
      message: `Tank control action '${action}' executed successfully`,
      data: result,
    };
  }

  @Post(':id/agitator/on')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async turnOnAgitator(@Param('id') id: string) {
    const result = await this.tankControlUseCase.controlAgitator(id, true);
    return {
      success: true,
      message: 'Agitator turned on successfully',
      data: result,
    };
  }

  @Post(':id/agitator/off')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async turnOffAgitator(@Param('id') id: string) {
    const result = await this.tankControlUseCase.controlAgitator(id, false);
    return {
      success: true,
      message: 'Agitator turned off successfully',
      data: result,
    };
  }

  @Post(':id/manual-fill/start')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async startManualFill(
    @Param('id') id: string,
    @Body() body?: { durationMinutes?: number },
  ) {
    const result = await this.tankControlUseCase.startManualFill(
      id,
      body?.durationMinutes,
    );
    return {
      success: true,
      message: 'Manual fill started successfully',
      data: result,
    };
  }

  @Post(':id/manual-fill/stop')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async stopManualFill(@Param('id') id: string) {
    const result = await this.tankControlUseCase.stopManualFill(id);
    return {
      success: true,
      message: 'Manual fill stopped successfully',
      data: result,
    };
  }

  @Post(':id/auto-fill/stop')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async stopAutoFill(@Param('id') id: string) {
    const result = await this.tankControlUseCase.stopAutoFill(id);
    return {
      success: true,
      message: 'Auto fill stopped successfully',
      data: result,
    };
  }

  // ===== LEVEL UPDATE (called from ESP32 via MQTT) =====
  @Post(':id/level')
  async updateLevel(@Param('id') id: string, @Body() body: { level: number }) {
    const result = await this.tankControlUseCase.updateLevel(id, body.level);
    return {
      success: true,
      message: 'Tank level updated successfully',
      data: result,
    };
  }

  // ===== STATISTICS =====
  @Get(':id/statistics')
  async getStatistics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const statistics = await this.tankControlUseCase.getTankStatistics(id, start, end);
    return {
      success: true,
      message: 'Tank statistics retrieved successfully',
      data: statistics,
      count: statistics.length,
    };
  }

  @Get(':id/statistics/today')
  async getTodayStatistics(@Param('id') id: string) {
    const statistics = await this.tankControlUseCase.getTodayStatistics(id);
    return {
      success: true,
      message: 'Today statistics retrieved successfully',
      data: statistics,
    };
  }

  // ===== LOGS =====
  @Get(':id/logs')
  async getLogs(@Param('id') id: string, @Query('limit') limit?: number) {
    const logs = await this.tankControlUseCase.getRecentLogs(id, limit || 50);
    return {
      success: true,
      message: 'Tank logs retrieved successfully',
      data: logs,
      count: logs.length,
    };
  }
}
