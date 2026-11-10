import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../../src-tauri/browser-bridge.js', import.meta.url), 'utf8');

function desktop(path = '/', reply = true) {
  const calls = [];
  const clicks = [];
  const revoked = [];
  const opened = [];
  class DesktopURL extends URL {}
  DesktopURL.createObjectURL = () => 'blob:http://tauri.localhost/export';
  DesktopURL.revokeObjectURL = (url) => revoked.push(url);
  class Anchor {
    constructor(href, download) { Object.assign(this, { href, download }); }
    hasAttribute(name) { return name === 'download' && this.download !== undefined; }
    click() { clicks.push(this.href); }
  }
  const window = {
    location: { href: `http://tauri.localhost${path}`, origin: 'http://tauri.localhost', pathname: path },
    __TAURI__: { core: { invoke: async (command, args) => {
      calls.push({ command, args });
      return reply;
    } } },
    open: (...args) => { opened.push(args); return 'browser-window'; },
    close: () => 'browser-close',
  };
  const fetched = [];
  vm.runInNewContext(source, {
    window, URL: DesktopURL, HTMLAnchorElement: Anchor, Uint8Array,
    console: { error() {} },
    fetch: async (url) => {
      fetched.push(url);
      return new Response('protocolo local');
    },
  });
  return { window, Anchor, URL: DesktopURL, calls, clicks, revoked, opened, fetched };
}

test('exportação mantém todos os bytes mesmo com revogação imediata da URL', async () => {
  const d = desktop();
  const bytes = [0, 1, 128, 255, 10];
  const url = d.URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
  new d.Anchor(url, 'geospt.xlsx').click();
  d.URL.revokeObjectURL(url);
  await setImmediate();
  assert.equal(d.calls[0].command, 'save_export');
  assert.equal(d.calls[0].args.name, 'geospt.xlsx');
  assert.deepEqual(Array.from(d.calls[0].args.bytes), bytes);
  assert.deepEqual(d.revoked, [url]);
  assert.equal(d.fetched.length, 0);
});

test('cancelar o diálogo não gera outra gravação nem mensagem de erro', async () => {
  const d = desktop('/', false);
  new d.Anchor(d.URL.createObjectURL(new Blob(['{}'])), 'obra.json').click();
  await setImmediate();
  assert.deepEqual(d.calls.map((call) => call.command), ['save_export']);
});

test('arquivo local do protocolo usa o mesmo download, sem acessar a rede externa', async () => {
  const d = desktop();
  new d.Anchor('http://tauri.localhost/FORMATO_EXTRACAO_NSPT.md', 'FORMATO_EXTRACAO_NSPT.md').click();
  await setImmediate();
  assert.deepEqual(d.fetched, ['http://tauri.localhost/FORMATO_EXTRACAO_NSPT.md']);
  assert.equal(new TextDecoder().decode(new Uint8Array(d.calls[0].args.bytes)), 'protocolo local');
  new d.Anchor('https://example.com/file', 'remoto').click();
  await setImmediate();
  assert.equal(d.calls.at(-1).command, 'desktop_error');
  assert.equal(d.fetched.length, 1);
});

test('links comuns mantêm seu comportamento e o manual abre a página local', async () => {
  const d = desktop();
  new d.Anchor('#secao').click();
  assert.deepEqual(d.clicks, ['#secao']);
  d.window.open('/manual.html', '_blank', 'noopener,noreferrer');
  await setImmediate();
  assert.equal(d.calls[0].command, 'open_manual');
  assert.equal(d.window.open('https://example.com', '_blank'), 'browser-window');
});

test('document.open/write/close entrega o relatório original sem transformá-lo', async () => {
  const d = desktop();
  const report = d.window.open('', '_blank');
  report.document.open();
  report.document.write('<!doctype html><html><body>σ = 32,84 tf');
  report.document.write('</body></html>');
  report.document.close();
  await setImmediate();
  assert.equal(d.calls[0].command, 'open_report');
  assert.equal(d.calls[0].args.html, '<!doctype html><html><body>σ = 32,84 tf</body></html>');
  assert.equal(d.window.close(), 'browser-close');
});

test('imprimir e fechar o relatório usam sua própria janela nativa', async () => {
  const d = desktop('/desktop-report.html');
  d.window.print();
  d.window.close();
  await setImmediate();
  assert.deepEqual(d.calls.map((call) => call.command), ['print_document', 'close_document']);
});
