import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from 'src/modules/users/adapters/in/controllers/users.controller';
import { UsersService } from 'src/modules/users/application/use-cases/users.service';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
import { RoleType } from 'src/shared/constantes/constants';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  const usersService = {
    findAll: jest.fn(),
    findActives: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'user-1', role: RoleType.ADMIN };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users/findAll (GET)', async () => {
    usersService.findAll.mockResolvedValue([{ id: 'user-1' }]);

    await request(app.getHttpServer())
      .get('/users/findAll?page=1')
      .expect(200)
      .expect([{ id: 'user-1' }]);
  });

  it('/users/actives (GET)', async () => {
    usersService.findActives.mockResolvedValue([{ id: 'user-2' }]);

    await request(app.getHttpServer())
      .get('/users/actives?page=1')
      .expect(200)
      .expect([{ id: 'user-2' }]);
  });
});
