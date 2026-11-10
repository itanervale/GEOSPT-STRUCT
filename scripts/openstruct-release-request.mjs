import assert from 'node:assert/strict';
import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function releaseVersion(tag) {
  assert.match(tag ?? '', /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w-]+(?:\.[\w-]+)*)?$/,
    'Informe uma tag SemVer, por exemplo v2.0.7.');
  const version = tag.slice(1);
  for (const part of version.split('-').slice(1).join('-').split('.')) {
    assert.ok(!/^0\d+$/.test(part) && !part.includes('_'), 'Pré-lançamento SemVer inválido.');
  }
  return version;
}

async function tagCommit(tag, request) {
  let object = tag.object;
  for (let depth = 0; object.type === 'tag' && depth < 8; depth++) {
    object = (await request(`git/tags/${object.sha}`)).object;
  }
  assert.equal(object.type, 'commit', 'A tag precisa apontar para um commit.');
  return object.sha;
}

// A tag só é criada após conferir os três manifests no SHA solicitado.
// Uma tag existente é imutável, inclusive nas reexecuções do workflow.
export async function prepareRelease({ tag, commit }, request) {
  const version = releaseVersion(tag);
  assert.match(commit ?? '', /^[a-f0-9]{40}$/, 'Informe o SHA completo do código.');
  const read = async (path) => {
    const file = await request(`contents/${path}?ref=${commit}`);
    assert.equal(file.encoding, 'base64');
    return Buffer.from(file.content, 'base64').toString('utf8');
  };
  const [pkg, config, cargo] = await Promise.all([
    read('package.json'), read('src-tauri/tauri.conf.json'), read('src-tauri/Cargo.toml'),
  ]);
  assert.equal(JSON.parse(pkg).version, version, 'package.json difere da tag.');
  assert.equal(JSON.parse(config).version, version, 'Tauri difere da tag.');
  const section = cargo.match(/\[package\]([\s\S]*?)(?=\n\[|$)/)?.[1];
  assert.equal(section?.match(/^version\s*=\s*"([^"]+)"/m)?.[1], version, 'Cargo difere da tag.');
  const existing = await request(`git/ref/tags/${encodeURIComponent(tag)}`, 'GET', undefined, true);
  if (existing) {
    assert.equal(await tagCommit(existing, request), commit, 'A tag aponta para outro commit. Use uma nova versão.');
  } else {
    await request('git/refs', 'POST', { ref: `refs/tags/${tag}`, sha: commit });
  }
  return { tag, commit };
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? '', /^[\w.-]+\/[\w.-]+$/);
  assert.ok(process.env.GH_TOKEN, 'Token do workflow ausente.');
  const request = async (path, method = 'GET', body, optional = false) => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'GeoSPT-Release',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    });
    if (optional && response.status === 404) return null;
    assert.ok(response.ok, `GitHub HTTP ${response.status} em ${path}.`);
    return response.json();
  };
  const result = await prepareRelease({
    tag: process.env.RELEASE_INPUT_TAG,
    commit: process.env.RELEASE_INPUT_COMMIT,
  }, request);
  await appendFile(process.env.GITHUB_OUTPUT, `tag=${result.tag}\ncommit=${result.commit}\n`);
  console.log(`Tag preparada: ${result.tag} · ${result.commit}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
