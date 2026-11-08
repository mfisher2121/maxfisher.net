#!/bin/sh
# Deploy maxfisher.net to Cloudflare Pages. Run from your own Terminal after `npx wrangler login`.
# First time only:  npx wrangler pages project create maxfisher-net --production-branch main
# Then in the Cloudflare dashboard: Pages > maxfisher-net > Custom domains > add maxfisher.net
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir dist
cp -R index.html 404.html styles.css robots.txt sitemap.xml favicon.svg max-fisher.jpg _headers local-services dentists beps about dist/
npx wrangler pages deploy dist --project-name maxfisher-net --branch main
