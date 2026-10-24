import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { BadGatewayError, GatewayTimeoutError, ValidationError } from '../../../../src/modules/shared/domain/errors/errors.js';
import { HttpClient, isUpstreamHttpError } from '../../../../src/modules/shared/infrastructure/http/http-client.js';
import { TokenService } from '../../../../src/modules/shared/infrastructure/security/token.service.js';

const configOf = (env: Record<string, unknown>) => ({ get: (key: string) => env[key] }) as unknown as ConfigService;
const statusOf = (error: unknown) => (isUpstreamHttpError(error) ? error.status : undefined);

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const networkFailure = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: { code } });

describe('HttpClient', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const client = new HttpClient(configOf({}));

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the token and parses the JSON answer', async () => {
    fetchMock.mockResolvedValue(json(200, { id: 'race-001' }));
    await expect(client.get<{ id: string }>('http://core:3001/v1/races/race-001', { token: 't0k' })).resolves.toEqual({ id: 'race-001' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://core:3001/v1/races/race-001');
    expect(init?.method).toBe('GET');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer t0k');
  });

  it('sends a JSON body', async () => {
    fetchMock.mockResolvedValue(json(201, { ok: true }));
    await client.post('http://items:3006/v1/items', { name: 'sword' }, { headers: { 'X-Test': '1' } });
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe('{"name":"sword"}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', 'X-Test': '1' });
  });

  it('maps a network failure to BadGatewayError with the system code', async () => {
    fetchMock.mockRejectedValue(networkFailure('ECONNREFUSED'));
    const error = await client.get('http://core:3001/v1/races/race-001?x=1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadGatewayError);
    expect((error as BadGatewayError).statusCode).toBe(502);
    expect((error as Error).message).toBe('core/v1/races/race-001 is not available (ECONNREFUSED)');
    expect(statusOf(error)).toBeUndefined();
  });

  it.each([400, 422])('maps a %s to ValidationError with the upstream message', async status => {
    fetchMock.mockResolvedValue(json(status, { message: 'name is required' }));
    const error = await client.post('http://core:3001/v1/races', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).statusCode).toBe(400);
    expect((error as Error).message).toBe(`core/v1/races answered ${status}: name is required`);
    expect(statusOf(error)).toBe(status);
  });

  it.each([404, 500, 503])('maps a %s to BadGatewayError and keeps the status', async status => {
    fetchMock.mockResolvedValue(json(status, { message: ['a', 'b'] }));
    const error = await client.delete('http://core:3001/v1/races/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadGatewayError);
    expect((error as BadGatewayError).statusCode).toBe(502);
    expect((error as Error).message).toBe(`core/v1/races/x answered ${status}: a, b`);
    expect(statusOf(error)).toBe(status);
  });

  it('returns undefined for an empty answer', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(client.delete('http://core:3001/v1/races/x')).resolves.toBeUndefined();
  });
});

describe('HttpClient timeout', () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    // Accepts the connection and never answers.
    server = createServer(() => undefined);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/races/slow`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  it('maps no answer within RMU_HTTP_TIMEOUT_MS to a 504 upstream-timeout', async () => {
    const client = new HttpClient(configOf({ RMU_HTTP_TIMEOUT_MS: 50 }));
    const error = await client.get(url).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GatewayTimeoutError);
    expect(error).toMatchObject({ statusCode: 504, code: 'upstream-timeout', message: '127.0.0.1/v1/races/slow did not answer in 50 ms' });
  });
});

describe('TokenService', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const env: Record<string, string> = {
    RMU_IAM_TOKEN_URI: 'http://iam/token',
    RMU_IAM_CLIENT_ID: 'rmu-api',
    RMU_IAM_CLIENT_SECRET: 'secret',
  };
  const config = configOf(env);

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests a client credentials token as a form and caches it', async () => {
    fetchMock.mockResolvedValue(json(200, { access_token: 'abc', expires_in: 300 }));
    const service = new TokenService(config);
    await expect(service.getToken()).resolves.toBe('abc');
    await expect(service.getToken()).resolves.toBe('abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://iam/token');
    expect(init?.method).toBe('POST');
    expect((init?.body as URLSearchParams).toString()).toBe('grant_type=client_credentials&client_id=rmu-api&client_secret=secret');
  });

  it('reports the answer of Keycloak when the token request fails', async () => {
    fetchMock.mockResolvedValue(json(401, { message: 'invalid client' }));
    const error = await new TokenService(config).getToken().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadGatewayError);
    expect(statusOf(error)).toBe(401);
  });
});
