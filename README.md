# Prazos da Assembleia de Arroios

Calculadora estática de apoio à preparação das sessões da Assembleia de Freguesia de Arroios. Usa Vite, JavaScript e Tailwind CSS; não depende de serviços externos para os cálculos.

A data inicial é calculada a partir do dia atual em Lisboa: procura a primeira sessão para a qual os prazos obrigatórios de convocação, entrega de documentos, publicidade e, nas sessões ordinárias, informação da Junta ainda podem ser cumpridos a partir de hoje. Para afixação e expedição, o planeamento só usa dias úteis, sem fins de semana ou feriados; numa sessão extraordinária, respeita também a janela de 3 a 10 dias entre convocação e sessão. É uma hipótese de planeamento, não uma garantia de que a expedição e a receção serão realizadas a tempo. Uma data alterada pela pessoa utilizadora mantém-se ao trocar o tipo de sessão.

## Desenvolvimento

```sh
npm ci
npm test
npm run dev
npm run build
```

O regimento usado é o [PDF publicado pela Junta](https://jfarroios.pt/wp-content/uploads/2022/09/Regimento_Dez2021_pdf.pdf). A capa menciona dezembro de 2021, mas o texto declara aprovação em **30 de junho de 2014** e entrada em vigor em **1 de julho de 2014**. As regras nacionais vêm da [Lei n.º 75/2013 consolidada](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2013-56366098); os feriados nacionais vêm do [Código do Trabalho](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475). A data de verificação jurídica aparece no site e em `src/rules.js`.

## Publicação

O workflow `.github/workflows/deploy.yml` executa testes, compila e publica `dist` no GitHub Pages em cada envio para `main`. Ativar **Settings → Pages → Source: GitHub Actions** no repositório. `vite.config.js` usa `base: './'` para que os ficheiros funcionem tanto em `https://<utilizador>.github.io/<repo>/` como no domínio próprio. `public/CNAME` inclui `prazos-assembleia.decidimosarroios.pt` no artefacto.

Ainda é necessário criar, no DNS de `decidimosarroios.pt`, um **CNAME** para `prazos-assembleia` a apontar para `<utilizador>.github.io` (substituir `<utilizador>` pelo proprietário real do repositório). Nas definições de Pages, confirmar o domínio personalizado, aguardar a verificação do DNS e ativar **Enforce HTTPS** quando disponível. O domínio não depende do subcaminho do repositório.
