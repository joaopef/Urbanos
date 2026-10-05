# Urbanos de Vila Real

Aplicação web não oficial para consultar linhas, paragens, horários e posições
dos autocarros dos Transportes Urbanos de Vila Real.

Site: https://joaopef.github.io/Urbanos/

## Desenvolvimento

```sh
cd tuvr-client/web
npm ci
npm run dev
```

## Publicação

Cada push para `main` executa os testes, compila a aplicação com o caminho base
`/Urbanos/` e publica `tuvr-client/web/dist` através do GitHub Actions.
GitHub Pages deve usar a origem **GitHub Actions**.

Para validar o build de publicação localmente:

```sh
cd tuvr-client/web
npm test
npm run build -- --base /Urbanos/
npm run preview
```

O site consulta diretamente a API externa, sem armazenar snapshots no
repositório. Em 3 de outubro de 2026, o endpoint de linhas respondeu com HTTP
200 e `Access-Control-Allow-Origin: *` para a origem `https://joaopef.github.io`.
A disponibilidade e os formatos da API podem mudar. Esta aplicação não é
afiliada ao operador nem ao fornecedor da aplicação oficial.

A pasta local de análise do APK, dependências, builds e configurações locais
estão excluídos da publicação.

## Estatísticas e QR code

Criar uma propriedade Google Analytics 4, com fuso horário de Lisboa, e um fluxo
Web para `https://joaopef.github.io/Urbanos/`. Colocar o ID `G-…` na variável de
repositório **GA_MEASUREMENT_ID** (Settings → Secrets and variables → Actions →
Variables) e executar novamente o workflow Publish GitHub Pages. O ID é público,
não é uma palavra-passe. Sem esta variável o Analytics e o aviso ficam desativados.

A tag só carrega em produção e depois de aceitar estatísticas. A escolha pode ser
alterada em Sobre os dados → Preferências de estatísticas. A recusa não impede o
uso do site. A medição não representa todos os visitantes: recusas e bloqueadores
podem impedir o registo. Desativar a medição melhorada no fluxo Web para manter a
recolha limitada às visitas; os eventos básicos de sessão são geridos pela Google.
As paragens dos links partilhados não são incluídas no URL enviado à tag.

Endereço para o QR code:
`https://joaopef.github.io/Urbanos/?utm_source=qr&utm_medium=offline&utm_campaign=divulgacao`

Os acessos com consentimento aparecem nos relatórios de aquisição com campanha
`divulgacao` e origem/meio `qr / offline`. Para testar, abrir o QR, aceitar as
estatísticas e consultar Tempo real no Analytics. A receção deve ser confirmada
na propriedade real; os testes locais só verificam a integração e o consentimento.
