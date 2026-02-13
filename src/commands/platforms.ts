import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getApiKey } from '../lib/config.js';
import { PicaApi } from '../lib/api.js';
import type { Platform } from '../lib/types.js';

export async function platformsCommand(options: { category?: string; json?: boolean }): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    p.cancel('Not configured. Run `pica init` first.');
    process.exit(1);
  }

  const api = new PicaApi(apiKey);

  const spinner = p.spinner();
  spinner.start('Loading platforms...');

  try {
    const platforms = await api.listPlatforms();
    spinner.stop(`${platforms.length} platforms available`);

    if (options.json) {
      console.log(JSON.stringify(platforms, null, 2));
      return;
    }

    // Group by category
    const byCategory = new Map<string, Platform[]>();
    for (const p of platforms) {
      const category = p.category || 'Other';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(p);
    }

    // Popular platforms (hardcoded based on common usage)
    const popular = ['gmail', 'slack', 'hubspot', 'notion', 'linear', 'github', 'jira', 'asana', 'salesforce', 'stripe'];
    const popularPlatforms = platforms.filter(p => popular.includes(p.platform));

    console.log();
    console.log(pc.bold(`  Available Platforms (${platforms.length})`));
    console.log();

    // Show popular first
    if (popularPlatforms.length > 0 && !options.category) {
      console.log(pc.cyan('  Popular:'));
      console.log(`    ${popularPlatforms.map(p => p.platform).join(', ')}`);
      console.log();
    }

    // Filter by category if specified
    if (options.category) {
      const categoryPlatforms = byCategory.get(options.category);
      if (!categoryPlatforms) {
        const categories = [...byCategory.keys()].sort();
        p.note(`Available categories:\n  ${categories.join(', ')}`, 'Unknown Category');
        process.exit(1);
      }

      console.log(pc.cyan(`  ${options.category}:`));
      const names = categoryPlatforms.map(p => p.platform).sort();
      printWrapped(names, 4, 80);
    } else {
      // Show all categories
      const sortedCategories = [...byCategory.keys()].sort();
      for (const category of sortedCategories) {
        const categoryPlatforms = byCategory.get(category)!;
        console.log(pc.cyan(`  ${category}:`));
        const names = categoryPlatforms.map(p => p.platform).sort();
        printWrapped(names, 4, 80);
        console.log();
      }
    }

    p.note(`Connect with: ${pc.cyan('pica connection add <platform>')}`, 'Tip');
  } catch (error) {
    spinner.stop('Failed to load platforms');
    p.cancel(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

function printWrapped(items: string[], indent: number, maxWidth: number): void {
  const prefix = ' '.repeat(indent);
  let line = prefix;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const separator = i < items.length - 1 ? ', ' : '';

    if (line.length + item.length + separator.length > maxWidth && line.length > indent) {
      console.log(line);
      line = prefix + item + separator;
    } else {
      line += item + separator;
    }
  }

  if (line.trim()) {
    console.log(line);
  }
}
