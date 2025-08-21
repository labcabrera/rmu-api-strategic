import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  HealthIndicatorResult,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@Controller('v1/health')
@ApiTags('Health')
export class HealthController {
  constructor(
    private config: ConfigService,
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health', operationId: 'health' })
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      () => this.memory.checkHeap('memory_heap', 350 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 350 * 1024 * 1024),
      async (): Promise<HealthIndicatorResult> => {
        const rmuApiCoreUri = this.config.get<string>('RMU_API_CORE_URI');
        const healthUri = `${rmuApiCoreUri}/health`;
        return await this.http.pingCheck('rmu-api-core', healthUri);
      },
    ]);
  }
}
