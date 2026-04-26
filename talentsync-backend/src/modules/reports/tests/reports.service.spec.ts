import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../reports.service';
import { PrismaService } from '../../../common/prisma.service';
import * as CacheUtil from '../../../common/cache.util';
import * as SqlUtil from '../../../common/sql.util';
import { ReportType } from '../dto/scheduled-report.dto';

// Mock dependencies
jest.mock('../../../common/cache.util');
jest.mock('../../../common/sql.util');

const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return cached data if available', async () => {
    (CacheUtil.getCached as jest.Mock).mockResolvedValue([{ count: 10 }]);
    const result = await service.getReportData(
      't1',
      ReportType.FUNNEL,
      {},
      false,
    );
    expect(result).toEqual([{ count: 10 }]);
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('should query db and cache if not cached', async () => {
    (CacheUtil.getCached as jest.Mock).mockResolvedValue(null);
    (SqlUtil.loadSQL as jest.Mock).mockReturnValue('SELECT * FROM ...');
    mockPrisma.$queryRaw.mockResolvedValue([{ count: 20 }]);

    const result = await service.getReportData(
      't1',
      ReportType.FUNNEL,
      {},
      false,
    );

    expect(result).toEqual([{ count: 20 }]);
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    expect(CacheUtil.setCached).toHaveBeenCalled();
  });
});
