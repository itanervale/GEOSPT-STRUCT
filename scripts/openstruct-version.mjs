import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { releaseVersion } from './openstruct-release-request.mjs';

const version = releaseVersion(`v${process.argv[2] ?? ''}`);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const config = JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8'));
const cargo = await readFile('src-tauri/Cargo.toml', 'utf8');
const section = cargo.match(/\[package\]([\s\S]*?)(?=\n\[|$)/)?.[1];
const previous = pkg.version;
assert.equal(config.version, previous, 'Sincronize os manifests antes de alterar a versão.');
assert.equal(section?.match(/^version\s*=\s*"([^"]+)"/m)?.[1], previous);
const cargoLock = await readFile('src-tauri/Cargo.lock', 'utf8');
const packageEntry = `name = "geosptstruct"\nversion = "${previous}"`;
assert.ok(cargoLock.includes(packageEntry), 'Cargo.lock está fora de sincronia.');
pkg.version = lock.version = lock.packages[''].version = config.version = version;
for (const [path, value] of Object.entries({
  'package.json': pkg, 'package-lock.json': lock, 'src-tauri/tauri.conf.json': config,
})) await writeFile(path, JSON.stringify(value, null, 2) + '\n');
await writeFile('src-tauri/Cargo.toml', cargo.replace(
  /(\[package\][\s\S]*?^version\s*=\s*")[^"]+/m, `$1${version}`,
));
await writeFile('src-tauri/Cargo.lock', cargoLock.replace(packageEntry, `name = "geosptstruct"\nversion = "${version}"`));
console.log(`Versão de distribuição: ${previous} → ${version}. Revise e faça o commit antes de criar a tag.`);
