import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EncryptionModule } from './encryption/encryption.module';
import { ScraperModule } from './scraper/scraper.module';
import { PrismaModule } from './prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { EmpresasModule } from './empresas/empresas.module';
import { AuthModule } from './auth/auth.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { EventsModule } from './events/events.module';
import { MailModule } from './mail/mail.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AsignacionesModule } from './asignaciones/asignaciones.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    UploadsModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    EncryptionModule,
    ScraperModule,
    EventsModule,
    MailModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      },
    }),
    BullModule.registerQueue({
      name: 'sunat-scraper-queue',
    }),
    EmpresasModule,
    AuthModule,
    NotificacionesModule,
    UsuariosModule,
    AsignacionesModule,
    EstadisticasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
