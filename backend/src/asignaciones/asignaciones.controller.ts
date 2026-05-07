import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('asignaciones')
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  // GET /asignaciones/:usuarioId — Ver empresas con flag asignada/no asignada
  @Get(':usuarioId')
  getEmpresasConAsignacion(@Param('usuarioId') usuarioId: string, @Request() req: any) {
    return this.asignacionesService.getEmpresasConAsignacion(req.user.id, usuarioId);
  }

  // POST /asignaciones — Asignar empresa a usuario
  @Post()
  asignar(@Body() body: { usuarioId: string; empresaId: string }) {
    return this.asignacionesService.asignar(body.usuarioId, body.empresaId);
  }

  // DELETE /asignaciones/:usuarioId/:empresaId — Revocar asignación
  @Delete(':usuarioId/:empresaId')
  revocar(@Param('usuarioId') usuarioId: string, @Param('empresaId') empresaId: string) {
    return this.asignacionesService.revocar(usuarioId, empresaId);
  }
}
