# GeoSPT desktop e distribuição OpenStruct

## Escopo

Esta camada acrescenta Tauri 2 ao React 18, JavaScript, Vite 7 e Tailwind existentes. Não migra a aplicação para TypeScript, React 19 ou Rust. Todos os arquivos preexistentes em `src/` e `public/`, o HTML de entrada e `vite.config.js` são preservados. A engine e sua versão continuam sob o controle do projeto original.

A referência é o empacotamento do `ricardocorsini/armadura-struct`: `src-tauri/`, comandos `desktop:dev` / `desktop:build`, Windows x86_64 com NSIS por usuário, Linux x86_64 com AppImage e `.deb`, validação em Actions e publicação central separada do código do produto. Não são incorporados o CAD, o atualizador interno nem os serviços de pastas do ArmaduraStruct.

| Item | Valor |
|---|---|
| Nome apresentado | GeoSPT |
| ID de distribuição reservado | `geosptstruct` |
| Identificador nativo | `com.openstruct.geosptstruct` |
| Executável | `geosptstruct` / `geosptstruct.exe` |
| Versão inicial de distribuição | `2.0.7`, igual ao `package.json` existente |
| Fonte | `itanervale/GEOSPT-STRUCT`, branch `main` |
| Destino planejado das releases assinadas | `ricardocorsini/openstruct-catalog` |

## Desenvolvimento e builds

Instale Node 22.12+, Rust estável e os [pré-requisitos do Tauri](https://v2.tauri.app/start/prerequisites/). No Windows, use as ferramentas C++ do Visual Studio e o WebView2. No Ubuntu/Debian, são necessários WebKitGTK 4.1, ferramentas de compilação e as bibliotecas listadas no workflow de CI.

```bash
npm ci
npm run desktop:dev
```

`vite.desktop.config.js` reaproveita a configuração web, fixa `127.0.0.1:1420` sem abrir o navegador e acrescenta somente a página vazia dos relatórios ao pacote. `npm run dev`, `build` e `preview` continuam usando a configuração web original.

```bash
# Executar no respectivo sistema operacional
npm run desktop:build -- --locked --bundles nsis
npm run desktop:build -- --locked --bundles deb,appimage
```

O build desktop embute `dist/`; o aplicativo instalado não inicia um servidor Vite nem exige Node ou Rust do usuário. No Linux, o AppImage depende das bibliotecas usuais do sistema e, conforme a distribuição, de FUSE ou extração do AppImage. O pacote `.deb` é uma alternativa para instalação pelo gerenciador de pacotes.

## Compatibilidade com os fluxos originais

`src-tauri/browser-bridge.js` é injetado somente pelo invólucro nativo. Ele não integra o bundle do site nem modifica os componentes:

- Downloads via `a.download` abrem o diálogo nativo Salvar. O Blob é capturado antes de a URL ser revogada, mantendo os bytes de JSON, XLSX, SVG e HTML. Cancelar não grava arquivo. O diálogo é a única origem do caminho de gravação; não é exposta uma API genérica de sistema de arquivos.
- Os dois relatórios continuam sendo gerados pelos mesmos módulos HTML. O pequeno adaptador `document.open/write/close` entrega o texto original a uma nova janela local. Seus botões usam impressão nativa, download de HTML e fechamento da própria janela.
- O manual e suas imagens são empacotados e abertos localmente. A importação por `<input type="file">`, o Web Crypto e o autosave em `localStorage` continuam sendo oferecidos pelo WebView.
- O autosave do aplicativo desktop pertence à sua origem e perfil nativos. Projetos existentes no navegador podem ser levados ao desktop pela exportação/importação JSON já existente.

Os relatórios e o manual existentes contêm scripts e handlers inline. A política CSP desktop permite esses scripts locais, sem acrescentar hashes que os desabilitem, e restringe conexões a recursos locais e IPC. O projeto não recebe permissões genéricas de shell ou arquivos. O ícone nativo usa apenas o nome GeoSPT e a cor do cabeçalho existente; sua fonte está em `src-tauri/icons/source.svg`.

## Verificação

```bash
npm run check
npm run test:core
npm run build
npm run build:desktop
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
```

`check` cobre os adaptadores de exportação, cancelamento, relatórios, impressão e tags imutáveis. `test:core` executa os testes originais em processos separados. A suíte completa roda em Linux; os dois testes originais que usam `/tmp` e imports absolutos POSIX são omitidos somente no Windows, sem alteração de seus fontes. O caso Balsas deve continuar retornando **32,84 tf**.

O workflow **Validate and build desktop** valida o projeto e compila os três formatos nas máquinas Windows e Linux do GitHub. Os artefatos servem para instalar e conferir o pacote antes da publicação.

Antes da primeira release, confira em ambos os sistemas:

1. Abrir o aplicativo sem servidor de desenvolvimento, navegar pelas sete abas e carregar Balsas.
2. Exportar e reimportar uma obra JSON; cancelar um diálogo; fechar e abrir para recuperar o autosave.
3. Gerar XLSX, JSON de auditoria/detalhamento, protocolo NSPT e SVG do corte.
4. Abrir os relatórios compacto/completo, baixar HTML, imprimir/salvar PDF e fechar somente o relatório.
5. Consultar e pesquisar o manual sem acesso à internet.

## Preparação de versões

Para a primeira publicação pode ser mantida a versão `2.0.7`. Para uma próxima versão:

```bash
npm run release:version -- 2.0.8
```

O comando sincroniza `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `Cargo.toml` e `Cargo.lock`. Ele não altera a engine nem a versão técnica mostrada por ela.

Faça o commit, aguarde o CI completo do SHA a publicar e execute **Prepare release tag** em Actions com `v2.0.7` (ou a nova versão) e o SHA completo validado. O workflow confere os três manifests naquele commit e cria a tag sem substituir uma tag existente. Preparar uma tag não publica instaladores, não altera o catálogo e não libera uma atualização aos usuários.

## Próxima etapa: publicador, catálogo e Launcher

Este PR não cadastra um produto sem instaladores no catálogo de produção. A continuação segue o mesmo modelo de publicação delegada do ArmaduraStruct, mantendo as chaves fora do repositório do GeoSPT:

1. Definir com o mantenedor a licença aplicável: a seção Licença do README original ainda contém um texto a preencher; este PR não escolhe uma licença pelo autor.
2. Cadastrar no `distribution.json` do hub o produto abaixo e acrescentar seus metadados ao catálogo base. O nome público pode continuar GeoSPT. O ícone do catálogo deve usar um identificador aceito pelo esquema do Launcher.

```json
{
  "id": "geosptstruct",
  "name": "GeoSPT",
  "sourceRepo": "itanervale/GEOSPT-STRUCT",
  "publisherRepo": "ricardocorsini/launcher-struct",
  "releaseRepo": "ricardocorsini/openstruct-catalog",
  "keyId": "launcher-packages-v1"
}
```

3. No publicador `launcher-struct`, acrescentar a rota **Publish GeoSPT**, com tag e SHA completos, chamando o workflow reutilizável do hub por um SHA fixo que já inclua o cadastro. Usar os Secrets existentes do publicador; o GeoSPT não precisa recebê-los.
4. Publicar Windows NSIS e Linux AppImage juntos; o publicador valida versão, origem e executável e gera as assinaturas e hashes exigidos pelo Launcher. A tag no hub será `geosptstruct-v2.0.7`, com arquivos `geosptstruct-2.0.7-windows-x86_64.exe` e `geosptstruct-2.0.7-linux-x86_64.AppImage`.
5. Sincronizar o catálogo assinado e conferir instalação, abertura e atualização pelo Launcher; em seguida, adicionar a página e os downloads no site OpenStruct. O `.deb` gerado pelo CI é um formato adicional; o contrato atual do catálogo usa NSIS e AppImage.

Atualização automática dentro do próprio GeoSPT pode ser tratada em outra entrega, se desejada. Ela não é necessária para instalar e atualizar o produto pelo Launcher.
