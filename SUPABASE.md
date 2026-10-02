# Configurar o Supabase (login, senha e dados na nuvem)

Sem esta configuração o app funciona normalmente, mas **só no aparelho** (sem login).
Depois de configurar, ele passa a exigir login e guarda os dados e as fotos na sua conta do Supabase.

## 1. Criar o projeto (grátis)

1. Acesse <https://supabase.com> e crie uma conta.
2. Clique em **New project**, escolha um nome (ex.: `queridinhas-slim`), defina uma senha forte para o banco e a região **South America (São Paulo)**.
3. Aguarde o projeto ficar pronto (1 a 2 minutos).

## 2. Criar as tabelas e as regras de segurança

1. No menu lateral, abra **SQL Editor** → **New query**.
2. Copie todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql), cole e clique em **Run**.
3. Deve aparecer "Success". Isso cria as tabelas, ativa o RLS (cada pessoa só acessa os próprios dados) e o bucket privado `progress-photos` para as fotos.

## 3. Configurar os e-mails de login

Em **Authentication → URL Configuration**:

- **Site URL**: o endereço onde o app web vai ficar publicado (para testes locais: `http://localhost:8081`).
- **Redirect URLs** — adicione:
  - `http://localhost:8081`
  - `queridinhasslim://auth` (app instalado no celular)
  - `exp://**` (testes pelo Expo Go)
  - o endereço do site publicado, quando houver

Em **Authentication → Providers → Email**, deixe **Confirm email** ligado (recomendado).

### Modelos de e-mail em português

Em **Authentication → Email Templates**, abra cada modelo, troque o conteúdo pelo HTML da pasta [`supabase/email-templates/`](supabase/email-templates/) e salve:

| Modelo no Supabase | Arquivo |
|---|---|
| Confirm signup | `confirmacao.html` |
| Reset password | `recuperar-senha.html` |

### Envio de e-mails (SMTP) — necessário para produção

Sem SMTP próprio, o Supabase só envia e-mails **para o dono do projeto** e no máximo ~2 por hora. Para que confirmação e recuperação de senha cheguem a qualquer pessoa, configure um SMTP em **Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**.

Serviços com plano grátis (escolha um e crie a conta):

- **Resend** (`smtp.resend.com`, porta `465`) — <https://resend.com>
- **Brevo** (`smtp-relay.brevo.com`, porta `587`) — <https://www.brevo.com>

Passos gerais:

1. Crie a conta no serviço e gere uma **API key** ou credenciais SMTP.
2. **Remetente**: o ideal é um e-mail de um domínio seu (ex.: `nao-responda@seudominio.com.br`), com o domínio verificado no serviço (registros SPF/DKIM) — isso evita que os e-mails caiam no spam. Sem domínio próprio, use o remetente de teste que o serviço fornece (só para testes).
3. No Supabase, em **SMTP Settings**, preencha host, porta, usuário, senha e o e-mail/nome do remetente. Atenção aos valores exatos de cada serviço:
   - **Resend** — host `smtp.resend.com`, porta `465`, **usuário literalmente `resend`** (não é o seu e-mail), senha = a **API key** (`re_...`). Remetente de teste: `onboarding@resend.dev`.
   - **Brevo** — host `smtp-relay.brevo.com`, porta `587`, usuário = o **e-mail de login do Brevo**, senha = a **SMTP key** gerada em *SMTP & API* (não é a senha da conta).
4. Em **Authentication → Rate Limits**, ajuste o limite de e-mails por hora conforme o plano.

## 4. Colocar as chaves no app

1. Em **Project Settings → API**, copie:
   - **Project URL**
   - **anon public** key (a chave pública; **nunca** use a `service_role` no app)
2. Na pasta do projeto, crie o arquivo `.env` (copie de `.env.example`) e preencha:

```
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

3. Reinicie o servidor: `npx expo start --clear`.

O arquivo `.env` já está no `.gitignore` e não vai para o GitHub.

## Como funciona

- **Login e senha**: senha com no mínimo 8 caracteres, com letras e números. A senha é guardada criptografada pelo Supabase.
- **Recuperação de senha**: "Esqueci minha senha" envia um link por e-mail; ao abrir o link, o app pede a nova senha.
- **Sincronização**: o app grava tudo no aparelho na hora e envia para o Supabase em seguida. Sem internet, continua funcionando e envia depois.
- **Troca de conta**: cada conta tem seus próprios dados. Ao sair, a cópia local é apagada (útil em aparelho compartilhado).
- **Dados antigos**: se o app já era usado antes do login, na primeira entrada ele oferece importar esses dados para a conta.
- **Apagar meus dados** (Perfil → Privacidade): exclui a conta, os registros e as fotos do servidor.

## Tabelas criadas

| Tabela | Conteúdo |
|---|---|
| `profiles` | cadastro, consentimento, preferências alimentares e lembretes |
| `day_logs` | registros do dia (água, refeições, caminhada, humor, check-in) |
| `weights` | medições de peso |
| `applications` | aplicações de TG (dose, horário, local, efeitos colaterais) |
| `body_checks` | avaliações a cada 15 dias (medidas e referências das fotos) |
| bucket `progress-photos` | fotos de evolução (privado, uma pasta por usuária) |
