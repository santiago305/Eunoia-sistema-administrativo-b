import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

@Controller()
class EmptyRootController {
  @Get('/health-e2e')
  health() {
    return { ok: true };
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EmptyRootController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET) returns 404 when no root route is defined', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404);
  });

  it('/health-e2e (GET) returns 200', () => {
    return request(app.getHttpServer())
      .get('/health-e2e')
      .expect(200)
      .expect({ ok: true });
  });
});
