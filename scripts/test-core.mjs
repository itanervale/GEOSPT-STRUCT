import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

// Cada teste já existente roda em seu processo, sem reescrever seus fontes.
// Dois deles usam /tmp e import absoluto POSIX; o CI Linux executa a suíte toda.
const posixOnly = new Set(['test-casamento.mjs', 'test-geometria-corte.mjs']);
for (const file of (await readdir('.')).filter((file) => /^test-.*\.mjs$/.test(file)).sort()) {
  if (process.platform === 'win32' && posixOnly.has(file)) {
    console.log(`${file}: executado pelo job Linux (o teste original usa /tmp).`);
    continue;
  }
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
