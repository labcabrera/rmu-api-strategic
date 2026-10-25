import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({ description: 'HTTP status code', example: 404 })
  statusCode: number;

  @ApiProperty({ description: 'Error class', example: 'NotFoundError' })
  error: string;

  @ApiProperty({
    description:
      'Stable error code for clients: not-found, forbidden, validation, bad-request, conflict, version-conflict, duplicate-key...',
    example: 'not-found',
  })
  code: string;

  @ApiProperty({
    description: 'Error message; a list of messages for request validation errors',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Character 6f1c2a9e-3b7d-4c55-9a43-0d2e8f1b7c11 not found',
  })
  message: string | string[];

  @ApiProperty({
    description: 'Optional data of the error, like the failures of an imported file by JSON path',
    required: false,
    type: Object,
  })
  details?: unknown;

  @ApiProperty({ description: 'Timestamp', example: '2023-01-01T00:00:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Request path, without the query string', example: '/v1/characters/6f1c2a9e-3b7d-4c55-9a43-0d2e8f1b7c11' })
  path: string;
}
