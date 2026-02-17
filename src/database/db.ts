/**
 * Database connection and initialization
 *
 * Architecture: Pre-built SQLite database (fail-fast design)
 * - Database is built at publish time and committed to git
 * - Users get instant startup with no build steps
 * - Pattern validation happens before deployment
 */

import Database from '@ansvar/mcp-sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to pre-built database (in project root)
const DB_PATH = join(__dirname, '../../data/patterns.db');

let db: InstanceType<typeof Database> | null = null;

/**
 * Get database instance (singleton pattern)
 */
export function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    try {
      db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

      // Optimize query performance (read-only pragmas)
      db.pragma('cache_size = -64000'); // 64MB cache
      db.pragma('temp_store = MEMORY');

      console.error('✅ Connected to STRIDE Patterns database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw new Error(
        `Database not found at ${DB_PATH}. ` +
        'Run "npm run build:db" to create the database from pattern files.'
      );
    }
  }
  return db;
}

/**
 * Close database connection (for cleanup)
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.error('✅ Database connection closed');
  }
}

/**
 * Get database statistics
 */
export interface DatabaseStats {
  total_patterns: number;
  stride_categories: number;
  technologies: number;
  frameworks: number;
  avg_confidence: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export function getDatabaseStats(): DatabaseStats {
  const db = getDatabase();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_patterns,
      COUNT(DISTINCT stride_category) as stride_categories,
      COUNT(DISTINCT technology) as technologies,
      COUNT(DISTINCT framework) as frameworks,
      ROUND(AVG(confidence_score), 2) as avg_confidence,
      SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_count,
      SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END) as high_count,
      SUM(CASE WHEN severity = 'Medium' THEN 1 ELSE 0 END) as medium_count,
      SUM(CASE WHEN severity = 'Low' THEN 1 ELSE 0 END) as low_count
    FROM patterns;
  `).get() as DatabaseStats;

  return stats;
}

/**
 * Get database version and last build time
 */
export interface DatabaseMetadata {
  schema_version: string;
  last_build: string;
  tier: string;
  jurisdiction: string;
}

export function getDatabaseMetadata(): DatabaseMetadata {
  const db = getDatabase();
  const rows = db.prepare('SELECT key, value FROM metadata').all() as Array<{ key: string; value: string }>;

  const metadata: Partial<DatabaseMetadata> = {};
  for (const row of rows) {
    metadata[row.key as keyof DatabaseMetadata] = row.value;
  }

  return metadata as DatabaseMetadata;
}
