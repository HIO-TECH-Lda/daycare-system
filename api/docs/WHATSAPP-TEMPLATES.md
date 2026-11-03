# Modelos de mensagem WhatsApp

**Centro Infantil Sonho de Criança** · actualizado a 3 de Novembro de 2026

O WhatsApp só deixa uma empresa enviar a primeira mensagem a alguém através de **modelos aprovados pela Meta**. Este documento tem os 12 modelos que o sistema usa, prontos a criar no Meta Business Manager, e explica o que custa cada um.

---

## Antes de começar

Precisa de:

1. Uma conta **Meta Business** verificada (business.facebook.com), com o nome do centro.
2. Uma **conta WhatsApp Business (WABA)** com o número de telefone do centro. O número deixa de poder ser usado na aplicação WhatsApp normal.
3. Uma **app Meta** com o produto WhatsApp, e um **utilizador de sistema** com um token permanente (permissões `whatsapp_business_messaging` e `whatsapp_business_management`).

A equipa técnica põe no servidor (Vercel):

| Variável | Onde a encontrar |
|---|---|
| `WHATSAPP_TOKEN` | Token permanente do utilizador de sistema |
| `WHATSAPP_PHONE_ID` | App Meta → WhatsApp → Configuração da API → *Phone number ID* (não é o número de telefone) |
| `WHATSAPP_APP_SECRET` | App Meta → Definições da app → Básicas → *Chave secreta da app* |
| `WHATSAPP_VERIFY_TOKEN` | Uma palavra secreta à escolha, usada uma vez ao ligar o webhook |

**Webhook de entrega** (para o ecrã *Notificações* mostrar «entregue» e «lida», e para enviar o email quando o WhatsApp falha): App Meta → WhatsApp → Configuração → Webhook:

- URL de callback: `https://<api>/api/v1/webhooks/whatsapp`
- Token de verificação: o valor de `WHATSAPP_VERIFY_TOKEN`
- Subscrever o campo **messages**

---

## Como criar cada modelo

No Meta Business Manager → **WhatsApp Manager → Modelos de mensagem → Criar modelo**:

- **Categoria:** Utilidade (todas as mensagens do centro são de serviço, não publicidade).
- **Nome:** exactamente o indicado abaixo (minúsculas e `_`).
- **Idioma:** Português (Portugal) — `pt_PT`.
- **Corpo:** copie o texto. Cada `{{1}}`, `{{2}}`… é preenchido pelo sistema; a Meta pede um exemplo para cada um (estão na tabela de cada modelo).
- **Botão** (quando indicado): *Visitar website*. Os endereços usam o domínio do portal, que aqui aparece como `https://portal.sonhodecrianca.co.mz` — troque pelo endereço real.

> A Meta costuma aprovar em minutos. Se rejeitar, quase sempre é por o texto parecer publicidade ou por haver variáveis seguidas sem texto entre elas; os textos abaixo já evitam isso.

> **«Factura»** ainda está por confirmar no glossário. Se o centro escolher outra palavra, mude-a nos modelos antes de os submeter (e avise a equipa técnica para mudar também os emails e o portal).

---

## Conta

### `sonho_invite` — convite para o portal

Enviado quando a administração cria uma conta (Encarregado de Educação, Educador ou Administração) ou reenvia o convite.

```
Olá {{1}}! O Centro Infantil Sonho de Criança criou a sua conta no portal, com o perfil {{2}}. Toque em «Activar conta» para escolher a sua palavra-passe. O convite é válido durante 7 dias.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Primeiro nome | Marta |
| `{{2}}` | Perfil | Encarregado de Educação |

**Botão:** *Visitar website* · texto «Activar conta» · URL **dinâmico** `https://portal.sonhodecrianca.co.mz/convite/{{1}}` · exemplo `https://portal.sonhodecrianca.co.mz/convite/exemplo123`

### `sonho_password_reset` — nova palavra-passe

Enviado quando alguém pede «Esqueci-me da palavra-passe» ou a administração gera um link em *Pessoas*.

```
Olá {{1}}! Recebemos um pedido para definir uma nova palavra-passe no portal Sonho de Criança. Toque em «Nova palavra-passe» para a escolher; o link é válido durante 24 horas. Se não fez este pedido, pode ignorar esta mensagem.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Primeiro nome | Marta |

**Botão:** *Visitar website* · texto «Nova palavra-passe» · URL **dinâmico** `https://portal.sonhodecrianca.co.mz/redefinir-senha?token={{1}}` · exemplo `https://portal.sonhodecrianca.co.mz/redefinir-senha?token=exemplo123`

---

## Matrícula

### `sonho_enrollment_received` — pedido de matrícula recebido

```
Olá {{1}}! Recebemos o pedido de matrícula de {{2}}, com a referência {{3}}. A administração do centro vai analisá-lo e entrará em contacto consigo.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Nome do Encarregado de Educação | Marta Sitoe |
| `{{2}}` | Nome da criança | Tito Sitoe |
| `{{3}}` | Referência do pedido | M-2026-0012 |

### `sonho_enrollment_approved` — matrícula aprovada

```
Olá {{1}}! A matrícula de {{2}} foi aprovada, na turma {{3}}, com início a {{4}}. Bem-vindos ao Centro Infantil Sonho de Criança!
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Nome do Encarregado de Educação | Marta Sitoe |
| `{{2}}` | Nome da criança | Tito Sitoe |
| `{{3}}` | Turma | Girassol |
| `{{4}}` | Data de início | 15/01/2027 |

---

## Propinas e facturas

### `sonho_invoice_new` — nova factura

```
Olá {{1}}! Foi emitida a factura {{2}} de {{3}}, no valor de {{4}}, com vencimento a {{5}}. Pode consultá-la no portal, em Facturação.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Primeiro nome | Marta |
| `{{2}}` | Número da factura | FAT-2026-0042 |
| `{{3}}` | Nome da criança | Tito Sitoe |
| `{{4}}` | Valor | 4 500,00 MT |
| `{{5}}` | Data de vencimento | 10/11/2026 |

**Botão:** *Visitar website* · texto «Ver facturas» · URL **estático** `https://portal.sonhodecrianca.co.mz/responsavel/facturacao`

### `sonho_invoice_overdue` — factura em atraso

```
Olá {{1}}! A factura {{2}} de {{3}}, no valor de {{4}}, venceu a {{5}} e ainda não está registada como paga. Se já pagou, use «Já paguei» no portal para nos avisar.
```

Variáveis e exemplos como em `sonho_invoice_new`. **Botão:** igual («Ver facturas», URL estático).

### `sonho_invoice_paid` — pagamento confirmado

```
Olá {{1}}! Confirmamos a recepção de {{2}}, referente à factura {{3}} de {{4}}. Obrigado!
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Primeiro nome | Marta |
| `{{2}}` | Valor | 4 500,00 MT |
| `{{3}}` | Número da factura | FAT-2026-0042 |
| `{{4}}` | Nome da criança | Tito Sitoe |

---

## Relatórios e mensagens

### `sonho_daily_report` — relatório do dia

```
Olá {{1}}! O relatório do dia de {{2}}, referente a {{3}}, já está disponível no portal Sonho de Criança.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Primeiro nome | Marta |
| `{{2}}` | Nome da criança | Tito |
| `{{3}}` | Data | 03/11/2026 |

**Botão:** *Visitar website* · texto «Abrir o portal» · URL **estático** `https://portal.sonhodecrianca.co.mz/responsavel`

### `sonho_monthly_report` — relatório mensal

```
Olá {{1}}! O relatório mensal de {{2}}, referente a {{3}}, já está disponível no portal Sonho de Criança.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Primeiro nome | Marta |
| `{{2}}` | Nome da criança | Tito |
| `{{3}}` | Mês e ano | Outubro 2026 |

**Botão:** *Visitar website* · texto «Ver relatórios» · URL **estático** `https://portal.sonhodecrianca.co.mz/responsavel/relatorios`

### `sonho_new_message` — nova mensagem

```
Olá {{1}}! Tem uma nova mensagem de {{2}} no portal Sonho de Criança.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Primeiro nome | Marta |
| `{{2}}` | Quem enviou | Educadora Joana |

**Botão:** *Visitar website* · texto «Abrir o portal» · URL **estático** `https://portal.sonhodecrianca.co.mz`

---

## Presenças

### `sonho_attendance_checkin` — entrada

```
Olá {{1}}! Registámos a entrada de {{2}} às {{3}} do dia {{4}} no Centro Infantil Sonho de Criança.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Primeiro nome | Marta |
| `{{2}}` | Nome da criança | Tito |
| `{{3}}` | Hora | 07:30 |
| `{{4}}` | Data | 03/11/2026 |

### `sonho_attendance_checkout` — saída

```
Olá {{1}}! Registámos a saída de {{2}} às {{3}} do dia {{4}}. Obrigado e até breve!
```

Variáveis e exemplos como em `sonho_attendance_checkin` (hora de saída, por exemplo 16:45).

---

## Quem recebe o quê

- **WhatsApp só com consentimento.** Cada pessoa aceita (ou não) receber mensagens por WhatsApp: na ficha de matrícula, ao activar a conta, ou no *Perfil*. Sem consentimento, só email.
- **Cada família escolhe**, no *Perfil*, por WhatsApp e/ou email, para: Presenças, Relatórios, Propinas e facturas, Mensagens. Por omissão tudo vai por WhatsApp e email, excepto as presenças, que vão só por WhatsApp.
- Convites, palavras-passe e matrículas vão sempre, pelos canais disponíveis.
- **Se o WhatsApp falhar** (número errado, telefone sem WhatsApp…), o sistema envia o mesmo aviso por email, se a pessoa tiver email. As presenças não passam para email.
- A administração vê tudo em **Notificações**: o que foi enviado, entregue, lido ou falhou, e pode reenviar.

## Custos

A Meta cobra cada mensagem de modelo **entregue**, por categoria e país. As de **Utilidade** são as mais baratas, e são **gratuitas** quando a pessoa escreveu ao centro pelo WhatsApp nas últimas 24 horas. Os preços para Moçambique estão em *developers.facebook.com/docs/whatsapp/pricing*; a fatura chega pela conta Meta Business, com o cartão ali registado.

As presenças são o grosso do volume: duas mensagens por criança por dia (entrada e saída). Para um centro com 60 crianças são cerca de 2 600 mensagens por mês só de presenças. Por isso as famílias podem desligá-las no *Perfil*, e a administração vê o volume em *Notificações*.
