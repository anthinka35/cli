import * as p from '@clack/prompts';
import pc from 'picocolors';
import { writeConfig, readConfig, getConfigPath } from '../lib/config.js';
import {
  getAllAgents,
  installMcpConfig,
  isMcpInstalled,
  getAgentConfigPath,
  supportsProjectScope,
  type InstallScope,
} from '../lib/agents.js';
import { PicaApi } from '../lib/api.js';
import { getApiKeyUrl, openApiKeyPage } from '../lib/browser.js';
import type { Agent } from '../lib/types.js';

export async function initCommand(options: { yes?: boolean; global?: boolean; project?: boolean }): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' Pica ')));

  const existingConfig = readConfig();

  if (existingConfig) {
    const shouldContinue = options.yes || await p.confirm({
      message: 'Pica is already configured. Do you want to reconfigure?',
      initialValue: false,
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.outro('Keeping existing configuration.');
      return;
    }
  }

  // Get API key
  p.note(`Get your API key at:\n${pc.cyan(getApiKeyUrl())}`, 'API Key');

  const openBrowser = await p.confirm({
    message: 'Open browser to get API key?',
    initialValue: true,
  });

  if (p.isCancel(openBrowser)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  if (openBrowser) {
    await openApiKeyPage();
  }

  const apiKey = await p.text({
    message: 'Enter your Pica API key:',
    placeholder: 'sk_live_...',
    validate: (value) => {
      if (!value) return 'API key is required';
      if (!value.startsWith('sk_live_') && !value.startsWith('sk_test_')) {
        return 'API key should start with sk_live_ or sk_test_';
      }
      return undefined;
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Validate API key
  const spinner = p.spinner();
  spinner.start('Validating API key...');

  const api = new PicaApi(apiKey);
  const isValid = await api.validateApiKey();

  if (!isValid) {
    spinner.stop('Invalid API key');
    p.cancel(`Invalid API key. Get a valid key at ${getApiKeyUrl()}`);
    process.exit(1);
  }

  spinner.stop('API key validated');

  // Save API key to config first
  writeConfig({
    apiKey,
    installedAgents: [],
    createdAt: new Date().toISOString(),
  });

  // Ask which agent to install for
  const allAgents = getAllAgents();

  const agentChoice = await p.select({
    message: 'Where do you want to install the MCP?',
    options: [
      {
        value: 'all',
        label: 'All agents',
        hint: 'Claude Code, Claude Desktop, Cursor, Windsurf',
      },
      ...allAgents.map(agent => ({
        value: agent.id,
        label: agent.name,
      })),
    ],
  });

  if (p.isCancel(agentChoice)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const selectedAgents: Agent[] = agentChoice === 'all'
    ? allAgents
    : allAgents.filter(a => a.id === agentChoice);

  // Ask about installation scope if any selected agent supports project scope
  let scope: InstallScope = 'global';
  const hasProjectScopeAgent = selectedAgents.some(a => supportsProjectScope(a));

  if (options.global) {
    scope = 'global';
  } else if (options.project) {
    scope = 'project';
  } else if (hasProjectScopeAgent) {
    const scopeChoice = await p.select({
      message: 'How do you want to install it?',
      options: [
        {
          value: 'global',
          label: 'Global (Recommended)',
          hint: 'Available in all your projects',
        },
        {
          value: 'project',
          label: 'Project only',
          hint: 'Creates config files in current directory',
        },
      ],
    });

    if (p.isCancel(scopeChoice)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    scope = scopeChoice as InstallScope;
  }

  // Handle project scope installation
  if (scope === 'project') {
    const projectAgents = selectedAgents.filter(a => supportsProjectScope(a));
    const nonProjectAgents = selectedAgents.filter(a => !supportsProjectScope(a));

    if (projectAgents.length === 0) {
      const supported = allAgents.filter(a => supportsProjectScope(a)).map(a => a.name).join(', ');
      p.note(
        `${selectedAgents.map(a => a.name).join(', ')} does not support project-level MCP.\n` +
        `Project scope is supported by: ${supported}`,
        'Not Supported'
      );
      p.cancel('Run again and choose global scope or a different agent.');
      process.exit(1);
    }

    // Install project-scoped agents
    for (const agent of projectAgents) {
      const wasInstalled = isMcpInstalled(agent, 'project');
      installMcpConfig(agent, apiKey, 'project');
      const configPath = getAgentConfigPath(agent, 'project');
      const status = wasInstalled ? 'updated' : 'created';
      p.log.success(`${agent.name}: ${configPath} ${status}`);
    }

    // If "all agents" was selected and some don't support project scope,
    // install those globally and let the user know
    if (nonProjectAgents.length > 0) {
      p.log.info(`Installing globally for agents without project scope support:`);
      for (const agent of nonProjectAgents) {
        const wasInstalled = isMcpInstalled(agent, 'global');
        installMcpConfig(agent, apiKey, 'global');
        const status = wasInstalled ? 'updated' : 'installed';
        p.log.success(`${agent.name}: MCP ${status} (global)`);
      }
    }

    const allInstalled = [...projectAgents, ...nonProjectAgents];

    // Update config
    writeConfig({
      apiKey,
      installedAgents: allInstalled.map(a => a.id),
      createdAt: new Date().toISOString(),
    });

    const configPaths = projectAgents
      .map(a => `  ${a.name}: ${pc.dim(getAgentConfigPath(a, 'project'))}`)
      .join('\n');

    let summary = `Config saved to: ${pc.dim(getConfigPath())}\n` +
      `MCP configs:\n${configPaths}\n\n`;

    if (nonProjectAgents.length > 0) {
      const globalPaths = nonProjectAgents
        .map(a => `  ${a.name}: ${pc.dim(getAgentConfigPath(a, 'global'))}`)
        .join('\n');
      summary += `Global configs:\n${globalPaths}\n\n`;
    }

    summary +=
      pc.yellow('Note: Project config files can be committed to share with your team.\n') +
      pc.yellow('Team members will need their own API key.\n\n') +
      `Next steps:\n` +
      `  ${pc.cyan('pica add gmail')}       - Connect Gmail\n` +
      `  ${pc.cyan('pica platforms')}        - See all 200+ integrations`;

    p.note(summary, 'Setup Complete');
    p.outro('Pica MCP installed!');
    return;
  }

  // Global scope: install to all selected agents
  const installedAgentIds: string[] = [];

  for (const agent of selectedAgents) {
    const wasInstalled = isMcpInstalled(agent, 'global');
    installMcpConfig(agent, apiKey, 'global');
    installedAgentIds.push(agent.id);

    const status = wasInstalled ? 'updated' : 'installed';
    p.log.success(`${agent.name}: MCP ${status}`);
  }

  // Save config
  writeConfig({
    apiKey,
    installedAgents: installedAgentIds,
    createdAt: new Date().toISOString(),
  });

  p.note(
    `Config saved to: ${pc.dim(getConfigPath())}\n\n` +
    `Next steps:\n` +
    `  ${pc.cyan('pica add gmail')}       - Connect Gmail\n` +
    `  ${pc.cyan('pica platforms')}        - See all 200+ integrations\n` +
    `  ${pc.cyan('pica connection list')}  - View your connections`,
    'Setup Complete'
  );

  p.outro('Your AI agents now have access to Pica integrations!');
}
