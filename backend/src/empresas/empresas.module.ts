import { Module } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { EncryptionModule } from '../encryption/encryption.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [EncryptionModule],
  controllers: [EmpresasController],
  providers: [EmpresasService, PrismaService],
})
export class EmpresasModule {}
