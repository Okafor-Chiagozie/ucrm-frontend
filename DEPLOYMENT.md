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

### 2. Zip the build
```bash
tar -czf dist.tar.gz -C dist .
```

### 3. Upload to Hostinger
```bash
scp -P 65002 dist.tar.gz u743308957@82.29.157.194:~/domains/nabeaucrm.site/public_html/
```

### 4. SSH in and extract
```bash
ssh -p 65002 u743308957@82.29.157.194
cd ~/domains/nabeaucrm.site/public_html
tar -xzf dist.tar.gz
rm dist.tar.gz
```

### 5. Verify
Visit https://nabeaucrm.site in your browser.

The .htaccess only needs to be created once — it persists across updates.
