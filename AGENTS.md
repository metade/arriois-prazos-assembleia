# Manutenção do calendário

Ao mudar o cálculo, rever as regras jurídicas ou preparar uma publicação, confirmar nas fontes oficiais atuais:

- a lista dos feriados nacionais obrigatórios e facultativos nos arts. 234.º e 235.º do Código do Trabalho;
- o feriado municipal de Lisboa de 13 de junho;
- os artigos aplicáveis da Lei n.º 75/2013 no Diário da República;
- o regimento vigente da Assembleia de Freguesia de Arroios, incluindo eventual substituição do PDF usado aqui.

Verificar os cálculos da Páscoa, Sexta-feira Santa e Corpo de Deus, bem como os anos atravessados por contagens. Executar `npm test` e `npm run build`; conferir manualmente um caso ordinário e outro extraordinário. Só atualizar `REVIEWED_ON` em `src/rules.js` depois desta revisão das fontes e dos testes. Uma edição de código não relacionada não significa que as regras tenham sido novamente verificadas.

O PDF atualmente ligado pelo site tem “DEZEMBRO 2021” na capa, mas declara no final aprovação em 30 de junho de 2014 e entrada em vigor em 1 de julho de 2014. Conferir sempre se existe versão posterior. Se existir, reavaliar os artigos 24.º, 25.º, 33.º, 35.º e 37.º, bem como os conflitos exibidos, antes de trocar o texto.
