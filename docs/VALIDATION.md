# Validação do MVP

## Automática

A suíte HTTP usa NestJS, PostgreSQL, SMTP/Mailpit, Redis/BullMQ e armazenamento S3 reais. Ela cobre:

- Pedido da instituição e oferta do doador, com aceitação somente pela outra parte.
- Duas aceitações simultâneas: uma reserva é criada e a segunda tentativa recebe conflito.
- Endereço, coordenadas e instruções de retirada ocultos antes da aceitação e para contas externas.
- Proposta, confirmação pela outra parte, reagendamento e invalidação do horário anterior.
- Início do transporte pelo responsável e recebimento confirmado pela instituição.
- Cancelamento que libera o anúncio e encerra a conversa.
- Rascunhos incompletos e validação ao publicar.
- Upload com verificação de bytes, tamanho e proprietário.
- Mensagens sem duplicação em tentativas repetidas e paginação de histórico.
- Cadastro institucional pendente, evidências privadas e ações restritas a administradores.
- Denúncias com registro de resolução e notificações persistidas na outbox.
- Confirmação de email, recuperação de senha, rotação de tokens e encerramento de sessão.

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, Expo Doctor e exportação web também fazem parte do CI.

## Revisão da interface

A versão web do mesmo código React Native permite verificar a navegação e os fluxos com as contas locais. Os screenshots e traces locais de revisão ficam em `output/playwright/` e são ignorados pelo Git.

Verificar a interface em 390 × 844 e 320 × 740, cobrindo login, descoberta, criação em três etapas, seleção de fotos, perfil institucional, ofertas, conversa e acompanhamento. Repetir com ampliação de texto e falha de conexão. Fotografias e endereços do seed são demonstrativos.

## Checklist em dispositivos

Esta etapa exige aparelhos e os builds/credenciais do Expo, Android e Apple. Aprovação do Expo Doctor e exportação web não confirmam o comportamento de câmera, teclado ou push em dispositivos.

- Android e iOS: login, retomada da sessão e saída da conta.
- Fonte ampliada: títulos, campos, botões e linha de acompanhamento continuam legíveis.
- Teclado aberto: última linha do formulário e envio de mensagem permanecem alcançáveis.
- Câmera/galeria: conceder, negar e revogar a permissão; enviar múltiplas fotos e remover uma delas.
- Localização: negar acesso e continuar pela cidade; conceder acesso e ordenar por distância.
- Rascunho: fechar e reabrir o app antes de publicar; os campos devem ser recuperados.
- Rede: desconectar durante upload/conversa e tentar novamente sem duplicar mensagens.
- Duas contas: solicitar, oferecer, aceitar, propor horário, confirmar, reagendar, transportar e receber.
- Push: tocar no aviso com o app em primeiro plano, em segundo plano e fechado.
- Email: abrir os links de confirmação e recuperação no aplicativo instalado.
- Cancelamento: anúncio volta à busca e a instituição anterior perde o endereço de retirada.

## Resultados em 10/10/2026

- 16 testes de integração passaram com os quatro serviços locais reais.
- Tipos, lint, formatação, compilação da API e exportação web passaram.
- Expo Doctor: 21/21 verificações aprovadas; projetos nativos gerados por CNG. A geração Android também é verificada no CI.
- Imagem Docker da API compilada e executada; `/v1/health` respondeu com sucesso.
- Interface em 390 × 844 e 320 × 740: login, upload real de foto, cadastro em três etapas, oferta direta, conversa, reserva, horário confirmado, transporte e recebimento revisados.
- Solicitação pela instituição: aceitação pelo doador, conversa, transporte externo com responsável/link, confirmação de horário e recebimento verificados pela interface. O link usado na revisão era demonstrativo; nenhum transporte foi contratado.
- Rascunho local recuperado após recarregar o aplicativo, preservando título e descrição.
- Token de acesso inválido renovado automaticamente, preservando a tela atual.
- Falha de rede durante envio: o texto permaneceu no campo, o erro apareceu e o reenvio após reconexão criou uma única mensagem.

Os resultados de CI estão no [PR #1](https://github.com/onicolasz/entrega-doacoes/pull/1/checks). O checklist em aparelhos continua necessário para teclado, câmera física, ampliação de fontes e push FCM/APNs.
