#!/bin/sh
set -e

# Railway injects a $PORT env var and expects the app to listen on it. nginx
# does not read env vars, so we render the config from a template here.
# Fall back to 8080 so `docker run` / local preview also works without $PORT.
NGINX_PORT="${PORT:-8080}"
export NGINX_PORT

envsubst '${NGINX_PORT}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'