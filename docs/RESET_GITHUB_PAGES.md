# Publicar a página de redirecionamento no GitHub Pages

Este arquivo explica como publicar a página de redirecionamento (`/docs/reset/index.html`) usando o GitHub Pages e como configurar o Firebase para aceitar o domínio.

Passos rápidos:

1. Confirme que os arquivos estão em `/docs/reset/index.html` (já incluído neste repositório).
2. Faça commit e push para o repositório no GitHub.
3. No GitHub, abra `Settings` → `Pages` (ou `Settings` → `Pages` no novo layout).
4. Em `Source`, selecione `Deploy from a branch` e escolha a branch `main` (ou `master`) e a pasta `/docs`.
5. Salve. O GitHub Pages publicará em `https://<SEU_USUARIO>.github.io/<SEU_REPO>/reset/`.

Após publicar:

- No Firebase Console → Authentication → Sign-in method → Authorized domains, adicione o domínio `SEU_USUARIO.github.io`.
- No seu código (`resetPassword.tsx`), atualize `actionCodeSettings.url` para apontar para o endereço publicado. Exemplo:

```js
const actionCodeSettings = {
  url: 'https://<SEU_USUARIO>.github.io/<SEU_REPO>/reset',
  handleCodeInApp: true,
};
```

Substitua `<SEU_USUARIO>` e `<SEU_REPO>` pelos valores do GitHub.

Observações:
- Para testes locais use `http://localhost:3000/reset` e adicione `localhost` em Authorized domains.
- Se quiser, posso atualizar automaticamente `resetPassword.tsx` com o URL final depois que você me informar o domínio publicado.
