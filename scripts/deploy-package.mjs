// Génère deploy/package.json : seul better-sqlite3 reste à installer sur l'hébergeur.
import fs from 'node:fs';
const root = JSON.parse(fs.readFileSync('package.json', 'utf8'));
fs.writeFileSync('deploy/package.json', JSON.stringify({
  name: 'gspme-saas',
  version: root.version,
  private: true,
  main: 'server.js',
  engines: { node: '>=18' },
  dependencies: { 'better-sqlite3': root.dependencies['better-sqlite3'] },
}, null, 2) + '\n');
console.log('deploy/ prêt : server.js, dist/, package.json');
