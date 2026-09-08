# Frontend Deployment — Hostinger

## Server Details
- **Host:** 82.29.157.194
- **SSH Port:** 65002
- **SSH User:** u743308957
- **Public folder:** `~/domains/nabeaucrm.site/public_html/`
- **URL:** https://nabeaucrm.site
- **API URL:** https://api.nabeaucrm.site/api/v1

---

## First-Time Deployment

### 1. Set production API URL
Ensure `.env.production` exists in the project root:
```
VITE_API_URL=https://api.nabeaucrm.site/api/v1
```

### 2. Build for production
```bash
npm run build
```

### 3. Upload dist to Hostinger
From your local PC terminal — zip first for speed:
```bash
cd crm-frontend
tar -czf dist.tar.gz -C dist .
scp -P 65002 dist.tar.gz u743308957@82.29.157.194:~/domains/nabeaucrm.site/public_html/
```

Then SSH in and extract:
```bash
ssh -p 65002 u743308957@82.29.157.194
cd ~/domains/nabeaucrm.site/public_html
tar -xzf dist.tar.gz
rm dist.tar.gz
```

### 4. Add .htaccess for SPA routing
```bash
cat > ~/domains/nabeaucrm.site/public_html/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(js|css|woff2|png|jpg|svg|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "index\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>
EOF
```

### 5. Verify
Visit https://nabeaucrm.site in your browser.

---

## Updating

### 1. Build locally
```bash
cd crm-frontend
npm run build
```

Confirm the bundle points at production and not localhost:
```bash
grep -o "https://api.nabeaucrm.site/api/v1" dist/assets/index-*.js | head -1
```
`npm run build` reads `.env.production`, not `.env` — the local `.env` port is
never baked into a production build.

### 2. Zip the build
```bash
tar -czf dist.tar.gz -C dist .
```

### 3. SSH in and back up the current build, then delete older archives

Only the newest backup is kept. Older ones are removed **after** the new archive
is verified readable, so a failed backup can never leave you with nothing.

```bash
ssh -p 65002 u743308957@82.29.157.194
cd ~/domains/nabeaucrm.site/public_html

FB=~/ucrm-frontend-backup-$(date +%F-%H%M%S).tar.gz
tar -czf "$FB" --exclude=api .

if tar -tzf "$FB" > /dev/null 2>&1; then
  echo "frontend backup OK — $(du -h "$FB" | cut -f1)"
  ls -t ~/ucrm-frontend-backup-*.tar.gz | tail -n +2 | xargs -r rm --
  echo "older frontend backups deleted"
else
  rm -f "$FB"
  echo "BACKUP FAILED — STOP, do not deploy"
fi
```

**`--exclude=api` is not optional.** `public_html/api/` is the Laravel front
controller for `api.nabeaucrm.site`. Never archive over it, delete it, or point
a git deploy at `public_html` — doing so takes the backend down with the
frontend.

### 4. Upload from your PC
```bash
scp -P 65002 dist.tar.gz u743308957@82.29.157.194:domains/nabeaucrm.site/public_html/
```

### 5. Extract on the server
```bash
cd ~/domains/nabeaucrm.site/public_html
tar -xzf dist.tar.gz && rm dist.tar.gz
ls api | head -3    # confirm the API folder survived
```

Extracting overwrites `index.html` and adds the new hashed assets; it does not
delete anything. Old `assets/index-*.js` files are left behind on purpose so
browsers holding a cached `index.html` keep working.

### 6. Verify
```bash
grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' index.html
```
That filename must match the one in your local `dist/index.html`. Then visit
https://nabeaucrm.site and hard-refresh.

The .htaccess only needs to be created once — it persists across updates.

---

## Rolling back

```bash
ls -lht ~/ucrm-frontend-backup-*.tar.gz
cd ~/domains/nabeaucrm.site/public_html
tar -xzf ~/ucrm-frontend-backup-<timestamp>.tar.gz
```

---

## Note on Hostinger's "Deploy from GitHub"

Do **not** connect this repo to `public_html`. Hostinger performs a plain git
checkout with no build step, so it would place `src/`, `package.json` and
`vite.config.ts` there — none of which a browser can run — and it targets the
directory containing `api/`.

If you want push-to-deploy, either point the domain at Vercel (which already
builds this repo on every push), or build in GitHub Actions and upload `dist`
over SFTP.
