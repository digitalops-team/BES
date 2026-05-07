import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Patch, ForbiddenException } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  create(@Body() createEmpresaDto: any, @Request() req: any) {
    if (req.user.rol !== 'SUPER_ADMIN') throw new ForbiddenException('Solo el administrador puede agregar empresas');
    return this.empresasService.create(createEmpresaDto, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.empresasService.findAllByUser(req.user.id, req.user.rol);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.empresasService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmpresaDto: any, @Request() req: any) {
    if (req.user.rol !== 'SUPER_ADMIN') throw new ForbiddenException('Solo el administrador puede editar empresas');
    return this.empresasService.update(id, updateEmpresaDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    if (req.user.rol !== 'SUPER_ADMIN') throw new ForbiddenException('Solo el administrador puede eliminar empresas');
    return this.empresasService.remove(id, req.user.id);
  }
}
