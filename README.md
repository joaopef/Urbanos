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
