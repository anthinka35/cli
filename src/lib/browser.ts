import open from 'open';

const PICA_APP_URL = 'https://app.picaos.com';

export function getConnectionUrl(platform: string): string {
  return `${PICA_APP_URL}/connections?#open=${platform}`;
}

export function getApiKeyUrl(): string {
  return `${PICA_APP_URL}/settings/api-keys`;
}

export async function openConnectionPage(platform: string): Promise<void> {
  const url = getConnectionUrl(platform);
  await open(url);
}

export async function openApiKeyPage(): Promise<void> {
  await open(getApiKeyUrl());
}
