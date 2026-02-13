import type {
  Connection,
  ConnectionsResponse,
  Platform,
  PlatformsResponse,
  PlatformAction,
  ActionsSearchResponse,
  ActionKnowledge,
  KnowledgeResponse,
} from './types.js';
import { normalizeActionId } from './actions.js';

const API_BASE = 'https://api.picaos.com/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class PicaApi {
  constructor(private apiKey: string) {}

  private async request<T>(path: string): Promise<T> {
    return this.requestFull<T>({ path });
  }

  private async requestFull<T>(opts: {
    path: string;
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
  }): Promise<T> {
    let url = `${API_BASE}${opts.path}`;
    if (opts.queryParams && Object.keys(opts.queryParams).length > 0) {
      const params = new URLSearchParams(opts.queryParams);
      url += `?${params.toString()}`;
    }

    const headers: Record<string, string> = {
      'x-pica-secret': this.apiKey,
      'Content-Type': 'application/json',
      ...opts.headers,
    };

    const fetchOpts: RequestInit = {
      method: opts.method || 'GET',
      headers,
    };

    if (opts.body !== undefined) {
      fetchOpts.body = JSON.stringify(opts.body);
    }

    const response = await fetch(url, fetchOpts);

    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(response.status, text || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.listConnections();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }
      throw error;
    }
  }

  async listConnections(): Promise<Connection[]> {
    const response = await this.request<ConnectionsResponse>('/vault/connections');
    return response.rows || [];
  }

  async listPlatforms(): Promise<Platform[]> {
    const allPlatforms: Platform[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await this.request<PlatformsResponse>(`/available-connectors?page=${page}&limit=100`);
      allPlatforms.push(...(response.rows || []));
      totalPages = response.pages || 1;
      page++;
    } while (page <= totalPages);

    return allPlatforms;
  }

  async searchActions(platform: string, query?: string, limit = 10): Promise<PlatformAction[]> {
    const queryParams: Record<string, string> = {
      limit: String(limit),
      executeAgent: 'true',
    };
    if (query) queryParams.query = query;

    const response = await this.requestFull<ActionsSearchResponse>({
      path: `/available-actions/search/${encodeURIComponent(platform)}`,
      queryParams,
    });
    return response.rows || [];
  }

  async getActionKnowledge(actionId: string): Promise<ActionKnowledge | null> {
    const normalized = normalizeActionId(actionId);
    const response = await this.requestFull<KnowledgeResponse>({
      path: '/knowledge',
      queryParams: { _id: normalized },
    });
    return response.rows?.[0] ?? null;
  }

  async executeAction(opts: {
    method: string;
    path: string;
    actionId: string;
    connectionKey: string;
    data?: unknown;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
    isFormData?: boolean;
    isFormUrlEncoded?: boolean;
  }): Promise<unknown> {
    const headers: Record<string, string> = {
      'x-pica-connection-key': opts.connectionKey,
      'x-pica-action-id': normalizeActionId(opts.actionId),
      ...opts.headers,
    };

    if (opts.isFormData) {
      headers['Content-Type'] = 'multipart/form-data';
    } else if (opts.isFormUrlEncoded) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    return this.requestFull<unknown>({
      path: `/passthrough${opts.path}`,
      method: opts.method.toUpperCase(),
      body: opts.data,
      headers,
      queryParams: opts.queryParams,
    });
  }

  async waitForConnection(
    platform: string,
    timeoutMs = 5 * 60 * 1000,
    pollIntervalMs = 5000,
    onPoll?: () => void
  ): Promise<Connection> {
    const startTime = Date.now();
    const existingConnections = await this.listConnections();
    const existingIds = new Set(existingConnections.map(c => c.id));

    while (Date.now() - startTime < timeoutMs) {
      await sleep(pollIntervalMs);
      onPoll?.();

      const currentConnections = await this.listConnections();
      const newConnection = currentConnections.find(
        c => c.platform.toLowerCase() === platform.toLowerCase() && !existingIds.has(c.id)
      );

      if (newConnection) {
        return newConnection;
      }
    }

    throw new TimeoutError(`Timed out waiting for ${platform} connection`);
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
