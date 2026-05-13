import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // SUPER_ADMIN y ADMIN pueden ver la lista de usuarios
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  findAll(@Request() req: any) {
    return this.usuariosService.findAll(req.user.rol);
  }

  // SUPER_ADMIN y ADMIN pueden crear usuarios
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() body: { email: string; password: string; nombre: string; rol: string }, @Request() req: any) {
    return this.usuariosService.create(body, req.user.rol);
  }

  // Ver detalle de un usuario con sus empresas asignadas (SUPER_ADMIN y ADMIN)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  // Solo SUPER_ADMIN y ADMIN pueden editar usuarios
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usuariosService.update(id, body);
  }

  // Solo SUPER_ADMIN y ADMIN pueden eliminar usuarios
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}

