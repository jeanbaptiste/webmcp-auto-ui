# code4code — MCP bridge

Proxy OAuth vers le serveur MCP Tricoteuses hébergé par code4code (`https://mcp.code4code.eu/mcp`).

## Topologie

```
browser
  → POST /mcp-code4code/mcp (nginx → bridge :9010)
  → bridge échange refresh_token via Keycloak
  → upstream https://mcp.code4code.eu/mcp
```

L'endpoint `/auth-test/` (nginx) route vers `/admin/` du bridge pour la persistence du token.

## Premier login

1. Ouvrir `https://demos.hyperskills.net/auth-test/` dans le navigateur
2. Cliquer **Login with code4code** — redirige vers Keycloak code4code
3. S'authentifier, puis cliquer **Save to bridge** pour stocker le refresh_token dans `/opt/mcp-bridge/code4code/tokens.json`
4. Le bridge renouvelle automatiquement l'access_token à chaque requête MCP

## Vérification

```bash
curl --netrc-file ~/.netrc \
  https://demos.hyperskills.net/mcp-code4code/mcp \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Une réponse `200` avec la liste des outils confirme que le bridge est opérationnel.

## Dette technique

Le bridge tourne en root (comme les autres bridges datagouv, etc.). À homogénéiser avec l'utilisateur système `mcpbridge` lors d'un prochain passage d'infrastructure.
