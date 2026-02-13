import type { Platform } from './types.js';

export function findPlatform(platforms: Platform[], query: string): Platform | null {
  const normalizedQuery = query.toLowerCase().trim();

  // Exact match first
  const exact = platforms.find(
    p => p.platform.toLowerCase() === normalizedQuery || p.name.toLowerCase() === normalizedQuery
  );
  if (exact) return exact;

  return null;
}

export function findSimilarPlatforms(platforms: Platform[], query: string, limit = 3): Platform[] {
  const normalizedQuery = query.toLowerCase().trim();

  // Simple similarity: platforms that contain the query or query contains part of platform
  const scored = platforms
    .map(p => {
      const name = p.name.toLowerCase();
      const slug = p.platform.toLowerCase();

      let score = 0;
      if (name.includes(normalizedQuery) || slug.includes(normalizedQuery)) {
        score = 10;
      } else if (normalizedQuery.includes(name) || normalizedQuery.includes(slug)) {
        score = 5;
      } else {
        // Levenshtein-lite: count matching characters
        score = countMatchingChars(normalizedQuery, slug);
      }

      return { platform: p, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(item => item.platform);
}

function countMatchingChars(a: string, b: string): number {
  let count = 0;
  const bChars = new Set(b.split(''));
  for (const char of a) {
    if (bChars.has(char)) count++;
  }
  return count;
}

export function formatPlatformList(platforms: Platform[]): string {
  const byCategory = new Map<string, Platform[]>();

  for (const p of platforms) {
    const category = p.category || 'Other';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(p);
  }

  const lines: string[] = [];
  const sortedCategories = [...byCategory.keys()].sort();

  for (const category of sortedCategories) {
    const categoryPlatforms = byCategory.get(category)!;
    const names = categoryPlatforms.map(p => p.platform).sort().join(', ');
    lines.push(`  ${category}: ${names}`);
  }

  return lines.join('\n');
}
