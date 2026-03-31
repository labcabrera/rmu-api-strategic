/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './modules/shared/interfaces/http/domain-exception.filter';

function configureOpenApi(app: INestApplication<any>) {
  const openApiConfig = new DocumentBuilder()
    .setTitle('Strategic API')
    .setDescription('Rolemaster Unified Strategic API.')
    .setVersion('1.0')
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'http://localhost:8090/realms/rmu-local/protocol/openid-connect/auth',
            tokenUrl: 'http://localhost:8090/realms/rmu-local/protocol/openid-connect/token',
            scopes: {
              read: 'Read',
              write: 'Write',
            },
          },
        },
      },
      'oauth2',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .addServer('http://localhost:3002', 'Local development server')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      urls: [
        {
          url: '/api-spec',
          name: 'OpenAPI Specification',
        },
      ],
    },
  });

  // Apply security schema to all paths except health endpoint
  document.paths = Object.entries(document.paths).reduce(
    (acc, [path, methods]) => {
      acc[path] = {};
      for (const method in methods) {
        if (path === '/health' && method === 'get') {
          acc[path][method] = { ...methods[method] };
        } else {
          acc[path][method] = {
            ...methods[method],
            security: [{ oauth2: [], 'access-token': [] }],
          };
        }
      }
      return acc;
    },
    {} as Record<string, Record<string, any>>,
  ) as typeof document.paths;

  app.use('/api-spec', (req, res) => {
    res.json(document);
  });
}

async function bootstrap() {
  const rawLevel = process.env.LOG_LEVEL || 'info';
  const levelMap: Record<string, string> = {
    error: 'error',
    warn: 'warn',
    info: 'log',
    log: 'log',
    debug: 'debug',
    verbose: 'verbose',
  };
  const ordered = ['error', 'warn', 'log', 'debug', 'verbose'];
  const mapped = levelMap[rawLevel.toLowerCase()] ?? 'log';
  const maxIndex = ordered.indexOf(mapped) >= 0 ? ordered.indexOf(mapped) : ordered.indexOf('log');
  const enabledLogger = ordered.slice(0, maxIndex + 1) as any;

  const app = await NestFactory.create(AppModule, { logger: enabledLogger });

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  configureOpenApi(app);

  const clientId = app.get(ConfigService).get<string>('RMU_KAFKA_CLIENT_ID')!;
  const brokers = app.get(ConfigService).get<string>('RMU_KAFKA_BROKERS')!.split(',');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: clientId,
        brokers: brokers,
      },
      consumer: {
        groupId: app.get(ConfigService).get<string>('RMU_KAFKA_CONSUMER_GROUP_ID')!,
      },
    },
  });

  app.useGlobalFilters(new DomainExceptionFilter());
  await app.listen(app.get(ConfigService).get<string>('PORT') || 3002);
  await app.startAllMicroservices();
}

void bootstrap();
