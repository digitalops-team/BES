import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EstadisticasService } from './estadisticas.service';

@UseGuards(JwtAuthGuard)
@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get()
  getStats(@Request() req: any) {
    return this.estadisticasService.getStats(req.user.id, req.user.rol);
  }
}
