#!/bin/bash
set -euo pipefail

mysql -u root -p"$MYSQL_ROOT_PASSWORD" < /schema/dbSyntax.sql
mysql -u root -p"$MYSQL_ROOT_PASSWORD" financial_system < /schema/auth_schema.sql
