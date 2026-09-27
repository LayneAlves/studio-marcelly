#!/usr/bin/env bash
set -euo pipefail

backup_dir="/var/backups/studio-marcelly"
timestamp="$(date +%F-%H%M%S)"

mkdir -p "$backup_dir"
mysqldump --defaults-extra-file=/etc/studio-marcelly/mysql-backup.cnf \
  --single-transaction --routines --triggers studio_marcelly \
  | gzip > "$backup_dir/studio_marcelly-$timestamp.sql.gz"

find "$backup_dir" -type f -name 'studio_marcelly-*.sql.gz' -mtime +14 -delete
