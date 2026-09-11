import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('unknown routes return 404', () => {
    return request(app.getHttpServer())
      .get('/definitely-not-a-route')
      .expect(404);
  });

  it('login with bad credentials is rejected (401) without crashing', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong', tenantId: '' });
    expect(res.status).toBe(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
