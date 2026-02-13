export interface Agent {
  id: string;
  name: string;
  configPath: string;
  configKey: string;
  detectDir: string;
  projectConfigPath?: string;
}

export interface Connection {
  id: string;
  platform: string;
  key: string;
  state: 'operational' | 'degraded' | 'failed' | 'unknown';
  createdAt?: string;
}

export interface Platform {
  id: number;
  name: string;
  key: string;
  platform: string;
  category: string;
  description?: string;
  status?: string;
  oauth?: boolean;
}

export interface PlatformsResponse {
  rows: Platform[];
  total: number;
  pages: number;
  page: number;
}

export interface Config {
  apiKey: string;
  installedAgents: string[];
  createdAt: string;
}

export interface ConnectionsResponse {
  rows: Connection[];
  total: number;
  pages: number;
  page: number;
}

export interface PlatformAction {
  _id: string;
  title: string;
  key: string;
  method: string;
  path: string;
  tags: string[];
  connectionPlatform?: string;
}

export interface ActionKnowledge {
  _id: string;
  connectionPlatform: string;
  title: string;
  path: string;
  knowledge: string;
  method: string;
  baseUrl: string;
  tags: string[];
  active: boolean;
}

export interface KnowledgeResponse {
  rows: ActionKnowledge[];
}

export interface ActionsSearchResponse {
  rows: PlatformAction[];
  total: number;
  pages: number;
  page: number;
}

export interface ExecuteResponse {
  success: boolean;
  responseData?: unknown;
  requestConfig?: unknown;
  platform?: string;
  action?: string;
  error?: string;
}
