#!/usr/bin/env bash
# Provisiona o banco MySQL de produção usando as variáveis já protegidas no .env.
# Uso na Oracle: sudo bash deploy/oracle/setup-database.sh

set -Eeuo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
env_file="${project_dir}/.env"
schema_file="${project_dir}/database/schema.sql"

if [[ ! -f "$env_file" ]]; then
    echo "Erro: .env não encontrado em ${env_file}." >&2
    exit 1
fi

if [[ ! -f "$schema_file" ]]; then
    echo "Erro: schema não encontrado em ${schema_file}." >&2
    exit 1
fi

read_env_value() {
    local key="$1"
    local value

    value="$(sed -n "s/^${key}=//p" "$env_file" | head -n 1 | tr -d '\r')"
    if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
        value="${value:1:-1}"
    elif [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
        value="${value:1:-1}"
    fi
    printf '%s' "$value"
}

DB_NAME="$(read_env_value DB_NAME)"
DB_USER="$(read_env_value DB_USER)"
DB_PASSWORD="$(read_env_value DB_PASSWORD)"

: "${DB_NAME:?Defina DB_NAME no .env}"
: "${DB_USER:?Defina DB_USER no .env}"
: "${DB_PASSWORD:?Defina DB_PASSWORD no .env}"

if [[ "$DB_NAME" != "studio_marcelly" ]]; then
    echo "Erro: o schema atual foi criado para o banco studio_marcelly." >&2
    exit 1
fi

if [[ ! "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "Erro: DB_USER deve conter somente letras, números e _." >&2
    exit 1
fi

# Escapa apóstrofos para usar a senha como literal SQL sem exibi-la no terminal.
db_password_sql="$(printf '%s' "$DB_PASSWORD" | sed "s/'/''/g")"

echo "Aplicando schema do banco ${DB_NAME}..."
sudo mysql < "$schema_file"

echo "Configurando acesso da aplicação..."
sudo mysql <<SQL
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${db_password_sql}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${db_password_sql}';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

echo "Banco e acesso da aplicação configurados com sucesso."
