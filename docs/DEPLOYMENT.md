# API, serviços externos e builds

## API em contêiner

```sh
docker build -f apps/api/Dockerfile -t entrega-api .
```

Execute migrations em uma tarefa de release, usando a mesma imagem e um **PostgreSQL novo**:

```sh
docker run --rm --env-file /caminho/entrega.production.env entrega-api   node apps/api/node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma

docker run --env-file /caminho/entrega.production.env -p 3333:3333 entrega-api
```

A imagem inclui os contratos compilados e o Prisma Client. O Compose fornecido é para desenvolvimento; os volumes locais não são uma estratégia de produção.

## Variáveis

| Variável                                    | Uso                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV=production`                       | Ativa a configuração de produção e recusa o segredo de desenvolvimento  |
| `DATABASE_URL`                              | PostgreSQL dedicado ao app                                              |
| `REDIS_URL`                                 | Redis persistente, com autenticação e TLS quando fornecido pelo serviço |
| `QUEUE_NAMESPACE`                           | Namespace exclusivo da fila por ambiente                                |
| `JWT_SECRET`                                | Segredo aleatório de pelo menos 32 caracteres                           |
| `CORS_ORIGINS`                              | Origens web permitidas, separadas por vírgula                           |
| `APP_URL`                                   | `entregadoacoes://` para links de confirmação e recuperação no app      |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`       | Serviço de email transacional                                           |
| `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | TLS e autenticação do SMTP, quando necessários                          |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`     | Serviço S3 e bucket privado                                             |
| `S3_PUBLIC_ENDPOINT`                        | Endpoint alcançável pelo celular, usado para assinar URLs               |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY`            | Credenciais do armazenamento, restritas ao bucket do aplicativo         |
| `EXPO_ACCESS_TOKEN`                         | Token opcional caso o projeto exija autenticação para enviar push       |
| `TRUST_PROXY`                               | Quantidade de proxies confiáveis; deixe sem configurar em acesso direto |

Coloque a API e o armazenamento atrás de HTTPS. Em produção, configure o CORS do bucket para as mesmas origens web do app, permitindo `GET`, `PUT` e `HEAD`, os cabeçalhos de upload e a leitura de `ETag`. Fotos e documentos ficam privados; as URLs de leitura expiram em uma hora e as de upload em cinco minutos.

O bucket deve existir ou as credenciais precisam permitir sua criação. O servidor verifica cada upload, transforma imagens em JPEG, remove metadados e limita o tamanho final a 1600 pixels. Comprovantes institucionais são vistos somente pelo representante e pela administração.

## Primeiro administrador

Cadastre e confirme o email do responsável pela operação. Em uma sessão administrativa do PostgreSQL dedicado ao app, promova somente essa conta, substituindo o email do exemplo:

```sql
UPDATE "User" SET "admin" = true WHERE "email" = 'responsavel@seu-dominio.com';
```

Ao entrar novamente no app, a aba Perfil exibirá **Administração**, com análise de instituições e denúncias. O seed de demonstração não deve ser utilizado para criar contas de produção.

## Builds Android e iOS

O `eas.json` já inclui os perfis `development`, `preview` e `production`.

```sh
cd apps/mobile
pnpm dlx eas-cli login
```

O repositório já está vinculado ao projeto [Entrega Doações no Expo](https://expo.dev/accounts/nicolasbarrosdesouza/projects/entrega-doacoes). Para usar outra conta/projeto, configure `EAS_PROJECT_OWNER` e `EAS_PROJECT_ID` no ambiente utilizado para avaliar o `app.config.ts`. O ID do projeto é público; credenciais de assinatura ficam na conta EAS. Configure também `EXPO_PUBLIC_API_URL`; para produção, o build exige uma URL HTTPS.

```sh
pnpm dlx eas-cli build --profile development --platform android
pnpm dlx eas-cli build --profile development --platform ios
pnpm dlx eas-cli build --profile development-simulator --platform ios
pnpm dlx eas-cli build --profile preview --platform android
pnpm dlx eas-cli build --profile production --platform all
```

`development` usa o dev client e se conecta ao Metro. `preview` gera um APK Android instalado diretamente. Os perfis de teste permitem HTTP para desenvolvimento em rede local; `production` desativa isso. Builds iOS para dispositivos precisam da conta Apple e da assinatura/distribuição configuradas no EAS. O identificador inicial é `com.entregadoacoes.mobile` e pode ser ajustado antes de registrar o app nas lojas.

## Builds disponíveis desta implementação

Compilados pelo EAS em **10/10/2026**, com o perfil `development-simulator`:

- Android: [baixar APK de desenvolvimento](https://expo.dev/artifacts/eas/WOhK0R1PzKX8Cyw4Sonr3pUgV-MLxGYx9I4u1nvHfjQ.apk) · [resultado da compilação](https://expo.dev/accounts/nicolasbarrosdesouza/projects/entrega-doacoes/builds/5b1b04cd-88cb-40ac-bafe-e8c7952be070).
- iOS: [baixar pacote para simulador](https://expo.dev/artifacts/eas/TUukeirUs9oA6DXau_oYW6V73wMZRtJRVM6yC_UWzf0.tar.gz) · [resultado da compilação](https://expo.dev/accounts/nicolasbarrosdesouza/projects/entrega-doacoes/builds/5f3ce390-97cc-4574-80f9-afbf13e158c1).

São development clients: precisam da API e do Metro ligados, usando a configuração de rede local descrita no README. O build Android também funciona em aparelhos; o pacote iOS serve apenas para o simulador. Para gerar um build iOS instalável no iPhone, use `development` e configure a assinatura Apple.

Os dois builds foram gerados a partir do commit `319b24f`, que contém a configuração e os módulos nativos atuais. As alterações posteriores são JavaScript/documentação e são carregadas pelo Metro. Gere um novo build quando mudar módulos ou configurações nativas. A compilação foi validada no EAS; a revisão em aparelhos permanece no checklist de validação.

## Notificações

1. Configure o ID real do projeto EAS e as credenciais FCM/APNs no projeto.
2. Instale um development build em um aparelho físico.
3. No Perfil, toque em **Ativar notificações** e conceda permissão.
4. Teste uma solicitação, uma mensagem e um agendamento entre duas contas.
5. Toque nas notificações com o app fechado e confirme a abertura da conversa ou conexão correta.

O servidor persiste eventos em uma outbox na mesma transação da mudança. Um dispatcher coloca os eventos na fila Redis, com tentativas e intervalo crescente. Avisos no app são deduplicados por evento e destinatário; o push depende da entrega do provedor. Eventos de outros ambientes devem usar namespaces diferentes.

## Operação

- `GET /v1/health` verifica o acesso ao PostgreSQL.
- Monitore logs de erro da API, eventos ainda não enviados na tabela `Outbox` e jobs com falha no Redis/BullMQ.
- Configure backups e restauração do PostgreSQL, persistência do Redis e política de retenção do bucket.
- Os registros `Upload` sem `confirmedAt` identificam envios incompletos para uma rotina de limpeza por idade.
- Execute o seed somente no ambiente local ou em um ambiente de demonstração separado.
- Publique Android/iOS após concluir a revisão de dispositivos e fornecer os dados das lojas, política de privacidade e contas de publicação.

A contratação de motoboys e Uber Direct não está habilitada. O app mantém o registro do transporte externo organizado pela instituição e seu acompanhamento por link.
