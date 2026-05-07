import { Controller, Get, Param, Patch, UseGuards, Request, Delete } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.notificacionesService.findAllByUser(req.user.id, req.user.rol);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificacionesService.markAsRead(id);
  }

  @Delete()
  removeAll(@Request() req: any) {
    return this.notificacionesService.removeAllByUser(req.user.id, req.user.rol);
  }
}
