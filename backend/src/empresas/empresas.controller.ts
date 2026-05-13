import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Patch } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(
    private readonly empresasService: EmpresasService,
    private readonly prisma: PrismaService,
  ) {}

  /** Obtiene el ID del SUPER_ADMIN dueño del sistema (para que ADMIN pueda crear empresas bajo su nombre) */
  private async getSuperAdminId(callerRol: string, callerId: string): Promise<string> {
    if (callerRol === 'SUPER_ADMIN') return callerId;
    // ADMIN: buscar al SUPER_ADMIN del sistema
    const superAdmin = await this.prisma.usuario.findFirst({ where: { rol: 'SUPER_ADMIN' } });
    return superAdmin?.id ?? callerId;
  }

  @Post()
  async create(@Body() createEmpresaDto: any, @Request() req: any) {
    const ownerId = await this.getSuperAdminId(req.user.rol, req.user.id);
    return this.empresasService.create(createEmpresaDto, ownerId);
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
  async update(@Param('id') id: string, @Body() updateEmpresaDto: any, @Request() req: any) {
    const ownerId = await this.getSuperAdminId(req.user.rol, req.user.id);
    return this.empresasService.update(id, updateEmpresaDto, ownerId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const ownerId = await this.getSuperAdminId(req.user.rol, req.user.id);
    return this.empresasService.remove(id, ownerId);
  }
}

