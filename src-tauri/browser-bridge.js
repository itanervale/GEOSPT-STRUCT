// Executado apenas pelo Tauri, antes da aplicação. Não é importado pelo site.
(() => {
  const invoke = (command, args) => window.__TAURI__.core.invoke(command, args);
  const reportError = (error) => {
    console.error('GeoSPT desktop:', error);
    void invoke('desktop_error', { message: String(error) }).catch(console.error);
  };

  // Retém o Blob na hora do clique: o código original revoga algumas URLs
  // imediatamente depois de chamar a.click(). Os bytes não são convertidos.
  const blobs = new Map();
  const createObjectURL = URL.createObjectURL.bind(URL);
  const revokeObjectURL = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    const url = createObjectURL(blob);
    blobs.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    blobs.delete(url);
    revokeObjectURL(url);
  };

  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!this.hasAttribute('download')) return click.call(this);
    const url = new URL(this.href, window.location.href);
    if (!['blob:', 'data:'].includes(url.protocol) && url.origin !== window.location.origin) {
      return reportError(new Error('A exportação precisa ser um arquivo local.'));
    }
    const name = this.download || 'exportacao';
    const blob = blobs.get(this.href);
    const content = blob ? blob.arrayBuffer() : fetch(url.href).then((response) => {
      if (!response.ok) throw new Error(`Não foi possível ler ${name}: HTTP ${response.status}`);
      return response.arrayBuffer();
    });
    void content.then((buffer) => invoke('save_export', {
      name,
      bytes: Array.from(new Uint8Array(buffer)),
    })).catch(reportError);
  };

  const open = window.open.bind(window);
  window.open = (url, target, features) => {
    if ((url === '' || url == null) && target === '_blank') {
      // Os dois geradores existentes só usam document.open/write/close.
      let html = '';
      return { document: {
        open() { html = ''; },
        write(...parts) { html += parts.join(''); },
        close() { void invoke('open_report', { html }).catch(reportError); },
      } };
    }
    const resolved = new URL(url, window.location.href);
    if (resolved.origin === window.location.origin && resolved.pathname === '/manual.html') {
      void invoke('open_manual').catch(reportError);
      return null;
    }
    return open(url, target, features);
  };

  window.print = () => { void invoke('print_document').catch(reportError); };
  if (window.location.pathname === '/desktop-report.html') {
    window.close = () => { void invoke('close_document').catch(reportError); };
  }
})();
