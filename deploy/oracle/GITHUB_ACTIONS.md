# Deploy automático pelo GitHub Actions

O workflow `.github/workflows/deploy-oracle.yml` publica cada `push` na branch `main`. Também pode ser iniciado manualmente na aba **Actions** do GitHub.

Ele envia apenas o código versionado, preserva o `.env` da VM, instala as dependências de produção e reinicia o serviço `studio-marcelly`.

## Secrets obrigatórios no GitHub

No repositório, acesse **Settings > Secrets and variables > Actions** e crie:

| Secret | Valor |
| --- | --- |
| `ORACLE_HOST` | IP ou domínio público da VM; atualmente `136.248.107.96` |
| `ORACLE_SSH_USER` | `ubuntu` |
| `ORACLE_SSH_PRIVATE_KEY` | Conteúdo completo do arquivo privado `ssh-key-2026-09-27.key` |
| `ORACLE_KNOWN_HOSTS` | Chave pública do host no formato `known_hosts` |

Para obter `ORACLE_KNOWN_HOSTS` no PowerShell, execute e copie toda a saída para o secret:

```powershell
ssh-keyscan -H 136.248.107.96
```

Nunca envie o arquivo `.key` para o Git. A chave privada deve existir apenas no computador autorizado e no secret do GitHub.

Depois de configurar os secrets e enviar o workflow ao GitHub, cada push para `main` publicará a nova versão. Acompanhe a execução em **Actions > Deploy na Oracle Cloud**.

O workflow não executa migrações de banco automaticamente. Publique migrações de forma revisada antes de enviar código que dependa delas.
