import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';

describe('Candidates (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let accessToken: string;
    let tenantId: string;
    let candidateId: string;
    const testEmail = `candidate-test-${Date.now()}@example.com`;

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
                name: 'Candidate Test User',
                companyName: 'Candidate Test Company',
            });

        accessToken = authResponse.body.accessToken;
        tenantId = authResponse.body.activeTenantId;
    });

    afterAll(async () => {
        // Cleanup
        try {
            if (candidateId) {
                await prisma.candidate.deleteMany({ where: { id: candidateId } });
            }
            await prisma.user.deleteMany({ where: { email: testEmail } });
        } catch (e) {
            // Ignore cleanup errors
        }
        await app.close();
    });

    describe('POST /candidates', () => {
        it('should create a new candidate', async () => {
            const response = await request(app.getHttpServer())
                .post('/candidates')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'John Doe',
                    email: 'john.doe@candidate.com',
                    phone: '+1234567890',
                    stage: 'applied',
                    source: 'LinkedIn',
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('John Doe');
            expect(response.body.email).toBe('john.doe@candidate.com');

            candidateId = response.body.id;
        });

        it('should require authentication', async () => {
            await request(app.getHttpServer())
                .post('/candidates')
                .send({
                    name: 'Jane Doe',
                    email: 'jane.doe@candidate.com',
                    stage: 'applied',
                })
                .expect(401);
        });
    });

    describe('GET /candidates', () => {
        it('should list candidates', async () => {
            const response = await request(app.getHttpServer())
                .get('/candidates')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter by stage', async () => {
            const response = await request(app.getHttpServer())
                .get('/candidates?stage=applied')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.data.every((c: any) => c.stage === 'applied')).toBe(true);
        });
    });

    describe('GET /candidates/:id', () => {
        it('should get candidate by id', async () => {
            const response = await request(app.getHttpServer())
                .get(`/candidates/${candidateId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.id).toBe(candidateId);
            expect(response.body.name).toBe('John Doe');
        });

        it('should return 404 for non-existent candidate', async () => {
            await request(app.getHttpServer())
                .get('/candidates/non-existent-id')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });
    });

    describe('PATCH /candidates/:id', () => {
        it('should update candidate', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/candidates/${candidateId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    stage: 'screening',
                    notes: 'Moved to screening',
                })
                .expect(200);

            expect(response.body.stage).toBe('screening');
        });
    });

    describe('POST /candidates/bulk', () => {
        it('should import multiple candidates', async () => {
            const response = await request(app.getHttpServer())
                .post('/candidates/bulk')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    candidates: [
                        { name: 'Bulk User 1', email: 'bulk1@test.com', stage: 'applied' },
                        { name: 'Bulk User 2', email: 'bulk2@test.com', stage: 'applied' },
                    ],
                })
                .expect(201);

            expect(response.body).toHaveProperty('imported');
            expect(response.body.imported).toBeGreaterThanOrEqual(2);
        });

        it('should detect duplicates', async () => {
            const response = await request(app.getHttpServer())
                .post('/candidates/bulk')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    candidates: [
                        { name: 'John Doe', email: 'john.doe@candidate.com', stage: 'applied' },
                    ],
                })
                .expect(201);

            expect(response.body).toHaveProperty('duplicates');
            expect(response.body.duplicates.length).toBeGreaterThan(0);
        });
    });

    describe('DELETE /candidates/:id', () => {
        it('should soft delete candidate', async () => {
            await request(app.getHttpServer())
                .delete(`/candidates/${candidateId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Verify candidate is soft deleted
            const response = await request(app.getHttpServer())
                .get(`/candidates/${candidateId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });
    });
});
