import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareRelease, releaseVersion } from '../openstruct-release-request.mjs';

function fixture(existing = null) {
  const writes = [];
  const release = { tag: 'v2.0.7', commit: 'a'.repeat(40) };
  const request = async (path, method = 'GET', body) => {
    if (method === 'POST') { writes.push(body); return {}; }
    if (path.startsWith('git/ref/tags/')) return existing;
    if (path.startsWith('git/tags/')) return { object: { type: 'commit', sha: release.commit } };
    const text = path.includes('Cargo.toml')
      ? '[package]\nname = "geosptstruct"\nversion = "2.0.7"\n'
      : '{"version":"2.0.7"}';
    return { encoding: 'base64', content: Buffer.from(text).toString('base64') };
  };
  return { release, request, writes };
}

test('a tag usa o commit explícito e não o HEAD do workflow', async () => {
  const f = fixture();
  assert.deepEqual(await prepareRelease(f.release, f.request), f.release);
  assert.deepEqual(f.writes, [{ ref: 'refs/tags/v2.0.7', sha: f.release.commit }]);
});

test('uma tag existente é idempotente e nunca é substituída', async () => {
  const f = fixture({ object: { type: 'commit', sha: 'a'.repeat(40) } });
  await prepareRelease(f.release, f.request);
  assert.equal(f.writes.length, 0);
  f.release.commit = 'b'.repeat(40);
  await assert.rejects(prepareRelease(f.release, f.request), /outro commit/);
  assert.equal(f.writes.length, 0);
});

test('tags anotadas também resolvem o commit antes da conferência', async () => {
  const f = fixture({ object: { type: 'tag', sha: 'c'.repeat(40) } });
  await prepareRelease(f.release, f.request);
  assert.equal(f.writes.length, 0);
});

test('divergência de versão impede criar a tag', async () => {
  const f = fixture();
  f.release.tag = 'v2.0.8';
  await assert.rejects(prepareRelease(f.release, f.request), /difere/);
  assert.equal(f.writes.length, 0);
});

test('recusa nomes de branch, comandos e versões inválidas', async () => {
  for (const tag of ['main', 'v01.2.3', 'v1.2.3-beta.01', 'v1.2.3+meta', 'v1.2.3;x', 'v1.2.3-foo_bar']) {
    assert.throws(() => releaseVersion(tag));
  }
  assert.equal(releaseVersion('v2.0.8-beta.1'), '2.0.8-beta.1');
  const f = fixture();
  await assert.rejects(prepareRelease({ ...f.release, commit: 'main' }, f.request), /SHA/);
  assert.equal(f.writes.length, 0);
});
