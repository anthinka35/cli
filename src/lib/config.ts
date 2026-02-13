import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Config } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.pica');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

export function readConfig(): Config | null {
  if (!configExists()) {
    return null;
  }
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as Config;
  } catch {
    return null;
  }
}

export function writeConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { mode: 0o700 });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getApiKey(): string | null {
  const config = readConfig();
  return config?.apiKey ?? null;
}

export function updateInstalledAgents(agentIds: string[]): void {
  const config = readConfig();
  if (config) {
    config.installedAgents = agentIds;
    writeConfig(config);
  }
}
