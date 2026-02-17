import Database from '@ansvar/mcp-sqlite';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../data/patterns.db'), { readonly: true, fileMustExist: true });

function hashTable(sql: string): string {
  const rows = db.prepare(sql).all();
  const content = JSON.stringify(rows);
  return createHash('sha256').update(content).digest('hex');
}

const hashes = {
  version: '1.0',
  generated: new Date().toISOString(),
  hashes: {
    patterns_count: (db.prepare('SELECT COUNT(*) as n FROM patterns').get() as { n: number }).n,
    patterns_hash: hashTable('SELECT id, title, stride_category, severity, cvss_score FROM patterns ORDER BY id'),
    dfd_elements_count: (db.prepare('SELECT COUNT(*) as n FROM dfd_elements').get() as { n: number }).n,
    dfd_elements_hash: hashTable('SELECT technology, dfd_role, category FROM dfd_elements ORDER BY technology'),
    linddun_threats_count: (db.prepare('SELECT COUNT(*) as n FROM linddun_threats').get() as { n: number }).n,
    linddun_threats_hash: hashTable('SELECT threat_id, category, tree_path FROM linddun_threats ORDER BY threat_id'),
    mitigations_count: (db.prepare('SELECT COUNT(*) as n FROM mitigations').get() as { n: number }).n,
    trust_boundaries_count: (db.prepare('SELECT COUNT(*) as n FROM trust_boundary_templates').get() as { n: number }).n,
  },
};

db.close();

const outPath = join(__dirname, '../fixtures/golden-hashes.json');
writeFileSync(outPath, JSON.stringify(hashes, null, 2) + '\n');
console.log(`Written golden hashes to ${outPath}`);
