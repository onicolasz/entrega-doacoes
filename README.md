# Entrega Doações

Aplicativo React Native para conectar pessoas doadoras a ONGs, coletivos e pontos de arrecadação. A pessoa publica um lote com fotos; a instituição solicita ou recebe uma oferta direta. Os participantes conversam, reservam o lote, combinam o transporte e confirmam o recebimento.

O piloto começa em Porto Alegre e região. Cidade e categorias são filtros configuráveis, sem limitar os cadastros a uma cidade no código.

## Executar localmente

Requisitos: Node.js **22.18+**, pnpm **12.8.1** e Docker com Compose.

```sh
cp .env.example .env
cp apps/mobile/.env.example apps/mobile/.env
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm db:seed
```

Inicie a API e o aplicativo em terminais separados:

```sh
pnpm dev:api
pnpm dev:mobile
```

Para conferir a interface no navegador, mantendo a API ligada:

```sh
pnpm --filter @entrega/mobile dev --web
```

- API e documentação interativa: http://localhost:3333/docs
- Interface web de desenvolvimento: http://localhost:8081
- Emails de confirmação e recuperação: http://localhost:58025
- PostgreSQL: porta `56432`; Redis: `56379`; S3: `59000`.
- `pnpm infra:down` para os serviços; os volumes são preservados.

**Use um banco novo para este pivot.** As migrations substituem o modelo do protótipo e não devem ser aplicadas sobre a base antiga. O histórico anterior continua no Git.

## Contas de demonstração

O seed cria instituições, endereços e anúncios fictícios com fotografias ilustrativas. Ele pode ser repetido sem apagar os registros existentes e recusa execução com `NODE_ENV=production`.

| Conta                | Perfil         |
| -------------------- | -------------- |
| `ana@example.test`   | Pessoa doadora |
| `casa@example.test`  | Casa do Bem    |
| `rede@example.test`  | Rede Circular  |
| `admin@example.test` | Administração  |

Senha **exclusivamente local**: `Doacao2026!`.

Para representar uma instituição, entre na conta correspondente e selecione a instituição na aba **Perfil**. Pessoas novas precisam confirmar o email; no ambiente local, o link aparece no Mailpit. Uma mesma conta pode doar e representar instituições.

## Testar em um celular

Use um development build, especialmente para câmera, notificações e comportamento de teclado. Expo Go não substitui a validação das notificações nativas.

1. Coloque o computador e o celular na mesma rede.
2. Em `apps/mobile/.env`, aponte `EXPO_PUBLIC_API_URL` para `http://IP_DO_COMPUTADOR:3333/v1`.
3. No `.env` da raiz, mantenha `S3_ENDPOINT=http://localhost:59000` e altere `S3_PUBLIC_ENDPOINT` para `http://IP_DO_COMPUTADOR:59000`.
4. Reinicie a API e o Metro após mudar os ambientes.
5. Instale o build de desenvolvimento e abra o projeto pelo Metro.

A API não precisa de chaves do Google Maps: o endereço é informado pelo usuário e as rotas abrem no aplicativo de mapas. A localização é opcional e serve para ordenar resultados por distância dentro da cidade selecionada.

## Estrutura

- `apps/mobile`: Expo SDK 57 estável, React Native, Expo Router e componentes próprios em Manrope.
- `apps/api`: NestJS, Prisma, PostgreSQL, fotos privadas em S3 e fila BullMQ com Redis.
- `packages/contracts`: schemas Zod, tipos e vocabulário compartilhados.
- `infra`: configuração local de S3. Docker usa SeaweedFS; a API também aceita outros serviços compatíveis com S3.

A API tem prefixo `/v1`; o Swagger descreve os corpos e parâmetros. Os principais grupos são `auth`, `organizations`, `donations`, `interests`, `conversations`, `uploads`, `notices`, `devices`, `reports` e `admin`.

Regras de reserva, permissões e estados são aplicadas no servidor. O app nunca acessa PostgreSQL diretamente. Conversas atualizam enquanto o aplicativo está ativo, com paginação do histórico e identificadores que evitam mensagens duplicadas em tentativas repetidas.

## Verificações

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test
pnpm --filter @entrega/mobile exec expo-doctor
pnpm --filter @entrega/mobile export:web
```

Os testes usam **TEST_DATABASE_URL**, em um banco separado cujo nome termina em `_test`. A suíte cria esse banco se necessário e aplica as migrations; não limpa a base principal. Os fixtures de teste são identificados com um prefixo aleatório. Redis e S3 precisam estar ligados.

O CI executa essas verificações em Linux, com PostgreSQL, Redis, S3 e email reais em contêineres. Consulte [validação e roteiro de dispositivos](docs/VALIDATION.md) e [configuração de produção e builds](docs/DEPLOYMENT.md).

## Transporte

Há três modalidades: retirada pela instituição, entrega pelo doador e transporte externo organizado pela instituição. O agendamento precisa de confirmação da outra parte; a instituição confirma o recebimento final. O serviço externo e seu link de acompanhamento são registrados no app.

A integração automática com Uber Direct será uma etapa posterior, após habilitação da conta e cobertura na região. Não há contratação ou cobrança automática de frete nesta versão.
