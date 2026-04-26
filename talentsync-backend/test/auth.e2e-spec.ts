import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';

describe('Auth (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!@#';
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = moduleFixture.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        // Cleanup test user
        try {
            await prisma.user.deleteMany({ where: { email: testEmail } });
        } catch (e) {
            // Ignore cleanup errors
        }
        await app.close();
    });

    describe('POST /auth/signup', () => {
        it('should create a new tenant and user', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    name: 'Test User',
                    companyName: 'Test Company',
                })
                .expect(201);

            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user.email).toBe(testEmail);
            expect(response.body.activeTenantId).toBeDefined();

            accessToken = response.body.accessToken;
            refreshToken = response.body.refreshToken;
        });

        it('should reject duplicate email', async () => {
            await request(app.getHttpServer())
                .post('/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    name: 'Duplicate User',
                    companyName: 'Duplicate Company',
                })
                .expect(400);
        });

        it('should reject weak password', async () => {
            await request(app.getHttpServer())
                .post('/auth/signup')
                .send({
                    email: 'weak-password@example.com',
                    password: '123',
                    name: 'Weak Password User',
                    companyName: 'Test Company',
                })
                .expect(400);
        });
    });

    describe('POST /auth/login', () => {
        it('should authenticate valid credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: testEmail,
                    password: testPassword,
                })
                .expect(200);

            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user.email).toBe(testEmail);

            accessToken = response.body.accessToken;
            refreshToken = response.body.refreshToken;
        });

        it('should reject invalid password', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: testEmail,
                    password: 'wrongpassword',
                })
                .expect(401);
        });

        it('should reject non-existent user', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testPassword,
                })
                .expect(401);
        });
    });

    describe('POST /auth/refresh', () => {
        it('should issue new tokens with valid refresh token', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(200);

            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');

            // Update tokens for subsequent tests
            accessToken = response.body.accessToken;
            refreshToken = response.body.refreshToken;
        });

        it('should reject invalid refresh token', async () => {
            await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);
        });
    });

    describe('GET /auth/me', () => {
        it('should return current user with valid token', async () => {
            const response = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.email).toBe(testEmail);
        });

        it('should reject request without token', async () => {
            await request(app.getHttpServer())
                .get('/auth/me')
                .expect(401);
        });

        it('should reject request with invalid token', async () => {
            await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });

    describe('POST /auth/logout', () => {
        it('should revoke all refresh tokens', async () => {
            await request(app.getHttpServer())
                .post('/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Verify refresh token is now invalid
            await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(401);
        });
    });
});
