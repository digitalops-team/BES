import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('auditoria')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('usuarioId') usuarioId?: string,
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('search') search?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.auditService.findAll({
      page,
      limit,
      usuarioId,
      accion,
      entidad,
      search,
      desde,
      hasta,
    });
  }

  @Get('acciones')
  async getAcciones() {
    return this.auditService.getAccionesUnicas();
  }
}
