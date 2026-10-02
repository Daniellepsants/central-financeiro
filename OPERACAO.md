# Central Financeira (Fin-Hub) — operação no servidor

Sistema no ar em **https://financeiro.169-58-32-104.sslip.io**, no servidor
169.58.32.104. Tudo roda nessa máquina: aplicação, banco de dados, login e
armazenamento de anexos. Não há dependência de nuvem externa, com uma única
exceção opcional, o envio de e-mails pelo Resend.

---

## Como está montado

| Peça | Onde | Porta |
|---|---|---|
| Aplicação (Next.js 14) | container `central-financeiro-app` | 127.0.0.1:8101 |
| Gateway do Supabase (Envoy) | container `supabase-envoy` | 127.0.0.1:8100 |
| Banco de dados (PostgreSQL) | container `supabase-db` | interno |
| Login (GoTrue), API de dados (PostgREST), anexos (Storage) | containers `supabase-*` | internos |
| nginx (TLS e entrada pública) | serviço do host | 80 / 443 |

Dois endereços públicos, com um certificado Let's Encrypt que cobre os dois e
renova sozinho (`certbot`, cert-name `central-financeiro`):

- `financeiro.169-58-32-104.sslip.io` — o sistema, para as pessoas usarem.
- `api-financeiro.169-58-32-104.sslip.io` — a API do Supabase. Precisa ser
  pública porque o login e o upload de anexos acontecem no navegador.

Nenhum serviço escuta direto na internet: todos publicam apenas em 127.0.0.1 e
o nginx é a única porta de entrada.

Arquivos em `/opt/central-financeiro`:

```
app/                     código (clone de FernandoAraujo89/central-financeiro, o repositório oficial do deploy; o de Daniellepsants é o upstream)
supabase/                Supabase self-hosted (compose oficial) + .env com os segredos
app.env                  configuração da aplicação (permissão 0600)
Dockerfile.app           imagem da aplicação
docker-compose.app.yml   serviço da aplicação
build-app.sh             reconstrói a imagem
criar_usuario.py         cria usuários
```

---

## O painel do banco (Supabase Studio) é privado de propósito

Na raiz, o gateway do Supabase serve o **Studio**, um painel que lê e escreve
qualquer tabela do banco. Como este sistema guarda dados financeiros, o nginx
libera para a internet apenas os quatro caminhos que a aplicação usa
(`/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1`) e devolve 403 no resto.

Para abrir o Studio, faça um túnel a partir da sua máquina:

```bash
ssh -L 8100:127.0.0.1:8100 root@169.58.32.104
```

e acesse `http://localhost:8100`. O usuário e a senha estão em
`/opt/central-financeiro/supabase/.env`, nas variáveis `DASHBOARD_USERNAME` e
`DASHBOARD_PASSWORD`.

---

## E-mails (Resend)

Ativo e verificado. O domínio `avantejuntos.com.br` está `verified` no Resend
(região sa-east-1) e o envio foi testado de ponta a ponta pelo próprio SDK
dentro do container, com status `delivered`.

- Remetente: `Central Financeira <faturamento@avantejuntos.com.br>`
- Recebe aviso de toda solicitação nova: `faturamento@avantejuntos.com.br`
- O sistema dispara e-mail em três situações: solicitação nova, menção ou
  resposta em comentário, e troca de responsável.

**Isso não interfere no Avante Mail.** Aquele sistema envia por Amazon SES,
como `news@campanhas.avantejuntos.com.br`, um subdomínio com registros DNS
próprios. As identidades, as credenciais e os containers são separados; o SPF
da raiz (Google, RD Station, SendGrid) não foi tocado, porque o Resend valida
pelo return-path `send.avantejuntos.com.br`.

O assunto do e-mail de recuperação está em português via
`MAILER_SUBJECTS_RECOVERY` no `.env` do Supabase (o corpo segue o template
padrão do GoTrue, em inglês; personalizar o corpo exige hospedar um HTML e
apontar `GOTRUE_MAILER_TEMPLATES_RECOVERY` para ele).

**Trocar a chave do Resend** (ex.: rotação após um vazamento). Já no servidor:

```bash
python3 /opt/central-financeiro/set_resend.py re_a_chave_nova
cd /opt/central-financeiro && docker compose -f docker-compose.app.yml up -d
```

Use sempre chave com permissão `Sending access`, nunca `Full access`: o sistema
só precisa enviar, e uma chave irrestrita permite criar e apagar domínios e
outras chaves da conta.

Para conferir a configuração sem enviar nada, use
`/opt/central-financeiro/verificar_resend.py`. Se ele responder 403 com "error
code 1010", é o Cloudflare bloqueando o User-Agent padrão do Python, não um
problema da chave; refaça a consulta com `curl`.

**O "esqueci minha senha" usa o mesmo Resend.** Quem envia esse e-mail é o
Supabase, não a aplicação, então o SMTP do GoTrue aponta para
`smtp.resend.com:587` (usuário `resend`, senha = a chave de API). Ao rotacionar
a chave, atualize os dois lugares: `app.env` e `supabase/.env`.

---

## Tarefas do dia a dia

**Criar um usuário** (papéis: `solicitante`, `analista_financeiro`, `administrador`).
A senha é sorteada e mostrada uma única vez; se preferir definir uma, passe-a
como quinto argumento.

```bash
ssh root@169.58.32.104 'python3 /opt/central-financeiro/criar_usuario.py maria@avantejuntos.com.br "Maria Silva" solicitante'
```

**Trocar a senha de alguém pelo servidor.** No uso normal ninguém precisa
disto: a pessoa troca a própria senha em **Minha conta**, no menu do usuário, e
quem esqueceu usa o **Esqueci minha senha** na tela de login. Este script serve
para quando alguém perde também o acesso ao próprio e-mail. A senha é digitada
oculta e não fica no histórico do shell:

```bash
python3 /opt/central-financeiro/trocar_senha.py pessoa@avantejuntos.com.br
```

A senha precisa ter no mínimo 8 caracteres. Se preferir uma sorteada pelo
script (ela aparece na tela, então cuidado com quem está olhando), acrescente
`--sortear`. Sessões já abertas continuam válidas até expirar, no máximo 1 hora.

**Publicar uma alteração do código** (depois de subir o commit para o GitHub):

```bash
ssh root@169.58.32.104 'sh /opt/central-financeiro/build-app.sh && cd /opt/central-financeiro && docker compose -f docker-compose.app.yml up -d'
```

**Ver o log da aplicação:**

```bash
ssh root@169.58.32.104 'docker logs -f --tail 100 central-financeiro-app'
```

**Parar ou subir o Supabase:**

```bash
ssh root@169.58.32.104 'cd /opt/central-financeiro/supabase && sh run.sh stop'
ssh root@169.58.32.104 'cd /opt/central-financeiro/supabase && sh run.sh start'
```

**Backup do banco:**

```bash
ssh root@169.58.32.104 'docker exec supabase-db pg_dump -U postgres postgres | gzip > /root/db-backups/central-financeiro-$(date +%F).sql.gz'
```

---

## Senhas: como funciona para o usuário

- **Trocar a própria senha:** menu do usuário (canto superior direito) →
  **Minha conta**. Pede a senha atual antes de aceitar a nova, para que uma
  sessão deixada aberta não permita a troca.
- **Esqueceu a senha:** link **Esqueci minha senha** na tela de login. Chega um
  e-mail com um link válido por 1 hora, que funciona em qualquer navegador ou
  celular, não só no aparelho que pediu.
- Mínimo de 8 caracteres, aplicado na tela (`PASSWORD_MIN_LENGTH` em
  `lib/validation.ts`) e no servidor (`GOTRUE_PASSWORD_MIN_LENGTH` no compose
  do Supabase). Alterar um sem o outro faz a tela prometer uma regra que o
  servidor recusa.

O link de recuperação traz a sessão no fragmento da URL (`#access_token=...`),
que o navegador nunca envia ao servidor. Por isso `/redefinir-senha` e
`/esqueci-senha` estão na lista de rotas públicas do `middleware.ts`: se
exigissem sessão, o middleware mandaria a pessoa para o login antes de o
JavaScript da página conseguir ler o fragmento. Se essas rotas saírem dessa
lista, a recuperação de senha para de funcionar sem dar erro visível.

---

## Detalhes que valem lembrar antes de mexer

**As variáveis `NEXT_PUBLIC_*` entram na imagem durante o build.** O Next.js
grava esses valores dentro do pacote que vai para o navegador. Trocar a URL ou a
chave pública no `app.env` não basta: é preciso reconstruir a imagem com o
`build-app.sh`. Já as variáveis do servidor (chave de serviço, Resend) são lidas
em tempo de execução e um `up -d` resolve.

**Não altere `POSTGRES_PORT` no `.env` do Supabase.** Ela é usada tanto para
publicar a porta no host quanto nas conexões internas entre os serviços;
mudá-la faz todos procurarem o banco no lugar errado. Como 5432 e 6543 já
estavam ocupadas nesta máquina por outras plataformas, a porta do host foi
fixada direto no `docker-compose.yml` (127.0.0.1:5433 e 127.0.0.1:6544).

**Cadastro público está desligado** (`DISABLE_SIGNUP=true`): ninguém cria conta
sozinho, só o administrador cria usuários. E-mails novos já entram confirmados
(`ENABLE_EMAIL_AUTOCONFIRM=true`), senão o usuário ficaria travado esperando uma
confirmação que não seria enviada.

**Anexos são imutáveis.** A migração cria políticas apenas de leitura e
inserção no `storage.objects`; apagar um anexo pela aplicação devolve 403. Isso
é do desenho do sistema, não um defeito.

**O `supabase/` é o compose oficial** e é atualizado por `sh run.sh` e
`update.sh`. A aplicação ficou num compose separado (`docker-compose.app.yml`)
justamente para não conflitar nessas atualizações.
