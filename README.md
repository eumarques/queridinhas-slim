# Queridinhas Slim — Expo SDK

Projeto-base funcional para Android, iOS e web, construído com Expo SDK 57 e TypeScript.

## Telas incluídas

- Início com próxima aplicação, resumo diário e evolução
- Diário de aplicação com dose, observações e histórico
- Progresso com peso, meta, gráfico, fotos e medidas
- Guia & Conteúdos
- Meu Dia: água, proteína, fibras, atividade, peso, aplicação e humor
- Perfil e configurações
- Paywall Premium com planos mensal e anual

## Rodar no celular com Expo Go

1. Instale Node.js e o aplicativo Expo Go.
2. Abra o terminal nesta pasta.
3. Execute `npm install`.
4. Execute `npx expo start`.
5. Leia o QR Code com o celular.

## Preparar builds Android e iOS

1. Entre na conta Expo: `npx eas login`
2. Vincule/crie o projeto: `npx eas init`
3. O comando anterior substituirá o `projectId` provisório do `app.json`.
4. Android para teste (APK): `npx eas build --platform android --profile preview`
5. Android para Play Store: `npm run build:android`
6. iOS para App Store: `npm run build:ios`

Antes da publicação, troque `com.queridinhasslim.app` pelos identificadores oficiais caso já estejam em uso, adicione ícone/splash definitivos e revise textos legais.

## O que ainda precisa ser conectado para produção

- Supabase: o código de login, senha, recuperação de senha, sincronização e fotos já está pronto; falta criar o projeto e colocar as chaves (veja [SUPABASE.md](SUPABASE.md))
- RevenueCat ou compras nativas: assinatura Premium
- Política de privacidade, termos e exclusão de conta
- Conteúdo revisado por profissional de saúde

O arquivo `.env.example` contém somente nomes das variáveis. Nunca envie chaves secretas no código-fonte.
