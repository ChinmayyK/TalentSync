import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';

describe('Interviews (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let accessToken: string;
    let tenantId: string;
    let candidateId: string;
    let interviewId: string;
    const testEmail = `interview-test-${Date.now()}@example.com`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = moduleFixture.get<PrismaService>(PrismaService);

        // Create test user and get access token
        const authResponse = await request(app.getHttpServer())
            .post('/auth/signup')
            .send({
                email: testEmail,
                password: 'TestPass123!@#',
                name: 'Interview Test User',
                companyName: 'Interview Test Company',
            });

        accessToken = authResponse.body.accessToken;
        tenantId = authResponse.body.activeTenantId;

        // Create a test candidate
        const candidateResponse = await request(app.getHttpServer())
            .post('/candidates')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Interview Candidate',
                email: 'interview.candidate@test.com',
                stage: 'applied',
            });

        candidateId = candidateResponse.body.id;
    });

    afterAll(async () => {
        // Cleanup
        try {
            if (interviewId) {
                await prisma.interview.deleteMany({ where: { id: interviewId } });
            }
            if (candidateId) {
                await prisma.candidate.deleteMany({ where: { id: candidateId } });
            }
            await prisma.user.deleteMany({ where: { email: testEmail } });
        } catch (e) {
            // Ignore cleanup errors
        }
        await app.close();
    });

    describe('POST /interviews', () => {
        it('should schedule a new interview', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const response = await request(app.getHttpServer())
                .post('/interviews')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    candidateId,
                    date: tomorrow.toISOString(),
                    durationMins: 60,
                    stage: 'screening',
                    type: 'video',
                    interviewerIds: [],
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.candidateId).toBe(candidateId);
            expect(response.body.status).toBe('scheduled');

            interviewId = response.body.id;
        });

        it('should require candidateId', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            await request(app.getHttpServer())
                .post('/interviews')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    date: tomorrow.toISOString(),
                    durationMins: 60,
                    stage: 'screening',
                })
                .expect(400);
        });
    });

    describe('GET /interviews', () => {
        it('should list interviews', async () => {
            const response = await request(app.getHttpServer())
                .get('/interviews')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should filter by status', async () => {
            const response = await request(app.getHttpServer())
                .get('/interviews?status=scheduled')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.every((i: any) => i.status === 'scheduled')).toBe(true);
        });
    });

    describe('GET /interviews/:id', () => {
        it('should get interview by id', async () => {
            const response = await request(app.getHttpServer())
                .get(`/interviews/${interviewId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.id).toBe(interviewId);
        });

        it('should return 404 for non-existent interview', async () => {
            await request(app.getHttpServer())
                .get('/interviews/non-existent-id')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });
    });

    describe('PATCH /interviews/:id', () => {
        it('should reschedule interview', async () => {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 2);
            newDate.setHours(14, 0, 0, 0);

            const response = await request(app.getHttpServer())
                .patch(`/interviews/${interviewId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    date: newDate.toISOString(),
                    durationMins: 45,
                })
                .expect(200);

            expect(response.body.durationMins).toBe(45);
        });
    });

    describe('POST /interviews/:id/cancel', () => {
        it('should cancel interview', async () => {
            const response = await request(app.getHttpServer())
                .post(`/interviews/${interviewId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ reason: 'Candidate unavailable' })
                .expect(200);

            expect(response.body.status).toBe('cancelled');
        });
    });

    describe('POST /interviews/:id/complete', () => {
        // Create a new interview for this test since we cancelled the previous one
        let completableInterviewId: string;

        beforeAll(async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const response = await request(app.getHttpServer())
                .post('/interviews')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    candidateId,
                    date: tomorrow.toISOString(),
                    durationMins: 60,
                    stage: 'screening',
                    type: 'video',
                });

            completableInterviewId = response.body.id;
        });

        it('should mark interview as completed', async () => {
            const response = await request(app.getHttpServer())
                .post(`/interviews/${completableInterviewId}/complete`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.status).toBe('completed');
        });
    });
});
