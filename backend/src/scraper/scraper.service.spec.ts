import { Test, TestingModule } from '@nestjs/testing';
import { ScraperService } from './scraper.service';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { MailService } from '../mail/mail.service';

describe('ScraperService', () => {
  let service: ScraperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperService,
        {
          provide: PrismaService,
          useValue: {
            empresa: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            notificacion: {
              findMany: jest.fn(),
              createMany: jest.fn(),
            },
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn(),
            decrypt: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendUrgentAlert: jest.fn(),
            sendPdfFailureSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScraperService>(ScraperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
