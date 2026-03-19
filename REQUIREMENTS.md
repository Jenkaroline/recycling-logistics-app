# Requisitos para rodar o recycling-logistics-app

Para rodar este projeto sem complicações após clonar do GitHub, siga estes passos:

## 1. Instale o Node.js e npm

- Baixe e instale o Node.js (que já inclui o npm) em https://nodejs.org/
- Versão recomendada: Node.js 18.x ou superior

## 2. Instale o Expo CLI globalmente

```
npm install -g expo-cli
```

## 3. Instale as dependências do projeto

No diretório raiz do projeto, execute:

```
npm install
```

## 4. Configuração do Firebase

- O projeto já inclui um exemplo de `google-services.json` e configuração do Firebase em `service/firebaseConfig.js`.
- Se quiser usar seu próprio projeto Firebase, substitua esses arquivos pelas suas credenciais.

## 5. Rodando o App

- Para iniciar o servidor de desenvolvimento do Expo:

```
npm start
```

- Ou use o app Expo Go no seu celular para escanear o QR code.

## 6. Notas adicionais

- Todas as dependências necessárias estão listadas no `package.json`.
- TypeScript e ESLint já estão incluídos para desenvolvimento.
- Para builds Android/iOS, garanta que você tem os SDKs necessários se for compilar localmente (veja a documentação do Expo).

## 7. Solução de problemas

- Se tiver problemas, tente deletar a pasta `node_modules` e rodar `npm install` novamente.
- Para mais ajuda, veja a [documentação do Expo](https://docs.expo.dev/).

