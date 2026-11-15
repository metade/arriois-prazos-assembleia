# Prazos da Assembleia de Arroios

Calculadora estática de apoio à preparação das sessões da Assembleia de Freguesia de Arroios. Usa Vite, JavaScript e Tailwind CSS; não depende de serviços externos para os cálculos.

A data inicial é calculada a partir do dia atual em Lisboa: procura a primeira sessão para a qual os prazos obrigatórios de convocação, entrega da ordem do dia com a documentação, publicidade e, nas sessões ordinárias, informação da Junta ainda podem ser cumpridos a partir de hoje. A convocatória formal e o edital têm prazo próprio; a ordem do dia é entregue com a documentação pelo menos dois dias úteis antes da sessão, mesmo que estas datas coincidam. Para afixação e expedição, o planeamento só usa dias úteis, sem fins de semana ou feriados; numa sessão extraordinária, respeita também a janela de 3 a 10 dias entre convocação e sessão. É uma hipótese de calendário que não verifica se as propostas, anexos ou assinaturas estão prontos, nem se houve expedição, receção ou acesso efetivo. Uma data alterada pela pessoa utilizadora mantém-se ao trocar o tipo de sessão, a margem ou a opção de Carnaval.

Cada cartão tem uma meta ajustável com os botões − / + ou pelo campo de data. A margem correspondente, entre 0 e 5 dias úteis, é mostrada automaticamente, sem seletor separado. A preparação usa 2 por defeito; as restantes etapas usam 0. As margens antecipam as metas planeadas a partir da data de referência mostrada no cartão, sem alterar os limites legais nem a preferência do PAOD. A preparação recua a partir da primeira meta de expedição ou afixação, para permitir obter a assinatura do edital a tempo. Fins de semana, feriados e, quando selecionado, Carnaval são excluídos. As margens de convocação e edital das extraordinárias são limitadas pela janela de dez dias antes da sessão; o cartão explica quando a margem pedida não cabe.

Cada etapa permite marcar «Concluído» (preenche hoje em Lisboa). O mesmo campo passa de «Meta planeada» para «Concluído em», mostrando a data real, que pode ser corrigida para uma data passada. A meta original continua indicada abaixo; não há um segundo calendário. Desmarcar ou apagar a data reabre a etapa. «Preparação e logística» corresponde às cinco tarefas listadas no cartão. A receção das convocatórias tem um cartão separado: expedir não marca as receções como confirmadas. A meta de acompanhamento da receção é um dia útil antes da sessão, antecipável pela margem própria, sem preceder a expedição planeada; não é um prazo legal autónomo nem uma estimativa do tempo de trânsito postal.

Os registos atualizam a próxima ação pendente, o contador e os avisos. Metas internas ultrapassadas são distinguidas de limites legais. Uma conclusão registada depois do limite legal ou fora da janela de convocação continua assinalada para revisão. Registar uma conclusão não certifica validade jurídica, horário de envio, entrega ou comprovativos. As metas e os limites permanecem visíveis para comparação com a data real; não se adiam prazos legais em função das conclusões.

As conclusões são guardadas em `localStorage` neste navegador, separadas por data e tipo de sessão. Outros navegadores e dispositivos não recebem estes registos. As margens e a opção de Carnaval podem mudar sem perder o progresso da mesma sessão. Ao ajustar uma meta ou começar o acompanhamento, a data sugerida fica fixa, para não mudar automaticamente enquanto o trabalho decorre. «Data calculada» volta a procurar uma sessão que acomode as margens escolhidas. Se o armazenamento estiver indisponível, a página explica que os registos só ficam em memória até fechar ou recarregar. Registos inválidos e datas futuras são ignorados.

O limite de planeamento para expedição pelos CTT é antes das 17h00 de Lisboa. A partir dessa hora, a sugestão automática exige expedição depois de hoje. Datas manuais mantêm-se; o aviso aparece se a expedição ainda estiver pendente e a meta ou limite de expedição for hoje. O aviso desaparece ao registar a expedição; é necessário confirmar o horário e os comprovativos. O relógio é atualizado a cada minuto, quando a página recupera o foco e quando volta a ficar visível.

A data, o tipo, as margens, a opção de Carnaval e a iniciativa (quando preenchida) ficam no URL para partilhar o plano, sem as conclusões. Por exemplo: `?date=2026-11-25&type=ordinaria&buffer=2&buffer-convocation=1&buffer-documents=3`. `buffer` continua a representar a preparação, preservando links anteriores. As outras margens usam `buffer-<id>` (`activity`, `convocation`, `documents`, `edict`, `publicity`, `receipt`, `paod`); valores fora de 0–5 usam os valores por defeito. Sem data válida no URL, a página calcula a primeira data que admite todas as metas desde hoje.

## Desenvolvimento

```sh
npm ci
npm test
npm run dev
npm run build
```

O regimento usado é o [PDF publicado pela Junta](https://jfarroios.pt/wp-content/uploads/2022/09/Regimento_Dez2021_pdf.pdf), com uma [cópia da versão consultada](sources/regimento-arroios-2014.pdf) e respetiva proveniência em [sources/README.md](sources/README.md). A capa menciona dezembro de 2021, mas o texto declara aprovação em **30 de junho de 2014** e entrada em vigor em **1 de julho de 2014**. As regras nacionais vêm da [Lei n.º 75/2013 consolidada](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2013-56366098); os feriados nacionais vêm do [Código do Trabalho](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475). A data de verificação jurídica aparece no site e em `src/rules.js`.

## Publicação

O workflow `.github/workflows/deploy.yml` executa testes, compila e publica `dist` no GitHub Pages em cada envio para `main`. Ativar **Settings → Pages → Source: GitHub Actions** no repositório. `vite.config.js` usa `base: './'` para que os ficheiros funcionem tanto em `https://<utilizador>.github.io/<repo>/` como no domínio próprio. `public/CNAME` inclui `prazos-assembleia.decidimosarroios.pt` no artefacto.

Ainda é necessário criar, no DNS de `decidimosarroios.pt`, um **CNAME** para `prazos-assembleia` a apontar para `<utilizador>.github.io` (substituir `<utilizador>` pelo proprietário real do repositório). Nas definições de Pages, confirmar o domínio personalizado, aguardar a verificação do DNS e ativar **Enforce HTTPS** quando disponível. O domínio não depende do subcaminho do repositório.
