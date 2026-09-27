# Publicação na Oracle Cloud Always Free

Este material prepara o Studio Marcelly Freitas para uma VM Always Free com Node.js, MySQL, Nginx e HTTPS. Ele não inclui segredos: as credenciais ficam exclusivamente no arquivo `.env` do servidor.

## O que ainda depende da conta da proprietária

1. Criar e validar uma conta Oracle Cloud (a validação exige cartão).
2. Criar uma instância Always Free com Ubuntu 22.04 ou 24.04.
3. Escolher e registrar o domínio. Para um domínio brasileiro, prefira registrar o `.com.br` no Registro.br em nome da proprietária.
4. No painel Oracle, liberar somente as portas TCP `80` e `443`. Não exponha `3000` nem `3306`.

## Preparar a VM

Depois de acessar a VM por SSH, execute:

```bash
sudo apt update
sudo apt install -y nginx mysql-server certbot python3-certbot-nginx git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo useradd --system --home /opt/studio-marcelly --shell /usr/sbin/nologin studio
sudo mkdir -p /opt/studio-marcelly /etc/studio-marcelly /var/backups/studio-marcelly
sudo chown -R studio:studio /opt/studio-marcelly
```

## Publicar o projeto e instalar dependências

Substitua `URL_DO_REPOSITORIO` pela URL privada ou pública do repositório Git:

```bash
sudo -u studio git clone URL_DO_REPOSITORIO /opt/studio-marcelly
cd /opt/studio-marcelly
sudo -u studio npm ci --omit=dev
sudo -u studio cp .env.example .env
sudo chmod 600 .env
sudo chown studio:studio .env
```

No arquivo `/opt/studio-marcelly/.env`, use no mínimo:

```dotenv
NODE_ENV=production
SERVER_HOST=127.0.0.1
PORT=3000
APP_URL=https://SEU_DOMINIO.com.br

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=studio_marcelly
DB_USER=studio_app
DB_PASSWORD=UMA_SENHA_FORTE_E_EXCLUSIVA
```

Também transfira para esse arquivo as configurações já usadas de SMTP ou Resend, e mantenha o `.env` fora do Git.

## Banco de dados

Crie o banco, importe a estrutura e limite o usuário da aplicação ao banco do Studio:

```bash
cd /opt/studio-marcelly
sudo mysql < database/schema.sql
sudo mysql
```

No console MySQL, execute substituindo a senha:

```sql
CREATE USER IF NOT EXISTS 'studio_app'@'127.0.0.1' IDENTIFIED BY 'UMA_SENHA_FORTE_E_EXCLUSIVA';
GRANT ALL PRIVILEGES ON studio_marcelly.* TO 'studio_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Para levar os dados de teste existentes do XAMPP, exporte localmente com `mysqldump -u root studio_marcelly > studio_marcelly.sql`, envie o arquivo por `scp` e importe na VM com `sudo mysql < studio_marcelly.sql`.

Depois que a conta da proprietária já existir no banco, defina o e-mail dela em `OWNER_EMAIL` no `.env` e execute:

```bash
cd /opt/studio-marcelly
sudo -u studio npm run setup-owner
```

## Serviço Node.js

```bash
sudo cp deploy/oracle/studio-marcelly.service /etc/systemd/system/studio-marcelly.service
sudo systemctl daemon-reload
sudo systemctl enable --now studio-marcelly
sudo systemctl status studio-marcelly
```

O aplicativo fica acessível apenas em `127.0.0.1:3000`; o Nginx recebe o tráfego externo.

## Domínio, Nginx e HTTPS

Depois de apontar os registros DNS `A` do domínio e `www` para o IP público da VM:

```bash
cd /opt/studio-marcelly
sudo sed 's/__DOMAIN__/SEU_DOMINIO.com.br/g' deploy/oracle/nginx.conf > /etc/nginx/sites-available/studio-marcelly
sudo ln -s /etc/nginx/sites-available/studio-marcelly /etc/nginx/sites-enabled/studio-marcelly
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d SEU_DOMINIO.com.br -d www.SEU_DOMINIO.com.br
```

## Backup diário do banco

```bash
sudo cp deploy/oracle/mysql-backup.cnf.example /etc/studio-marcelly/mysql-backup.cnf
sudo nano /etc/studio-marcelly/mysql-backup.cnf
sudo chmod 600 /etc/studio-marcelly/mysql-backup.cnf
sudo cp deploy/oracle/backup-mysql.sh /usr/local/sbin/studio-marcelly-backup
sudo chmod 700 /usr/local/sbin/studio-marcelly-backup
sudo crontab -e
```

No `crontab` de `root`, adicione:

```cron
30 3 * * * /usr/local/sbin/studio-marcelly-backup
```

O script guarda os últimos 14 dias na própria VM. Baixe periodicamente uma cópia para fora da Oracle; uma VM não substitui um backup externo.
