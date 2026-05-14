import { Controller, Get, Param, Patch, UseGuards, Request, Delete } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  /** Bandeja de entrada — notificaciones sin leer para este usuario */
  @Get()
  findBandeja(@Request() req: any) {
    return this.notificacionesService.findBandejaByUser(req.user.id, req.user.rol);
  }

  /** Archivo — notificaciones ya leídas por este usuario */
  @Get('archivo')
  findArchivo(@Request() req: any) {
    return this.notificacionesService.findArchivoByUser(req.user.id, req.user.rol);
  }

  /** Marcar una notificación como leída (solo para este usuario) */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificacionesService.markAsRead(id, req.user.id);
  }

  /** Marcar TODAS como leídas (solo para este usuario) */
  @Patch('mark-all-read')
  markAllAsRead(@Request() req: any) {
    return this.notificacionesService.markAllAsRead(req.user.id, req.user.rol);
  }

  /** Eliminar una notificación (SUPER_ADMIN/ADMIN) + PDF del disco */
  @Delete(':id')
  removeOne(@Param('id') id: string, @Request() req: any) {
    return this.notificacionesService.removeOne(id, req.user.id, req.user.rol);
  }

  /** Eliminar todas (SUPER_ADMIN/ADMIN) */
  @Delete()
  removeAll(@Request() req: any) {
    return this.notificacionesService.removeAllByUser(req.user.id, req.user.rol);
  }
}

