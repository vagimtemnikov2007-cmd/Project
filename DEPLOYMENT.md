# 🚀 Production Deployment Guide

## Перед развертыванием

### Безопасность

- [ ] **HTTPS only** - Service Worker работает только на HTTPS (или localhost)
- [ ] **Content Security Policy (CSP)**
  ```html
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self'; script-src 'self' https://telegram.org">
  ```
- [ ] **CORS Headers** правильно настроены на сервере
- [ ] **API endpoints** используют POST (не GET для чувствительных данных)
- [ ] **Auth tokens** хранятся безопасно (httpOnly cookies)

### Производительность

- [ ] Код минифицирован
- [ ] Images оптимизированы (WebP, lazy loading)
- [ ] CSS критический код встроен
- [ ] JS разбит на chunks (code splitting)
- [ ] Используются CDN для статики
- [ ] Включено gzip compression на сервере

### SEO & Meta

- [ ] `manifest.json` валиден
- [ ] иконки существуют (всех размеров)
- [ ] `og:` тэги для соц. сетей
- [ ] robots.txt правильный
- [ ] sitemap.xml (если нужно)

## Production Build

### 1. Webpack конфиг (если используете)

```javascript
// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './index.html',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        modules: {
          test: /\/modules\//,
          name: 'modules',
          priority: 10,
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
```

### 2. Environment variables

```bash
# .env.production
REACT_APP_API_URL=https://lsd-server-ml3z.onrender.com
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
```

```javascript
// api.module.js
export const API_BASE = process.env.REACT_APP_API_URL || "https://lsd-server-ml3z.onrender.com";
```

### 3. Версионирование

```javascript
// version.js
export const APP_VERSION = "1.0.0";
export const BUILD_DATE = new Date().toISOString();
export const COMMIT_HASH = "abc123def456"; // из CI/CD
```

## Развертывание

### На Vercel

```bash
# package.json
{
  "scripts": {
    "build": "npm run build:webpack",
    "start": "serve dist"
  }
}
```

```yaml
# vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "max-age=3600" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### На Netlify

```yaml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Cache-Control = "max-age=3600"
```

### На Docker

```dockerfile
# Dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  
  # Service Worker
  location /sw.js {
    add_header Cache-Control "max-age=0, no-cache, no-store";
    add_header Service-Worker-Allowed "/";
  }

  # Static files
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    add_header Cache-Control "max-age=31536000, immutable";
  }

  # HTML - всегда свежий
  location ~* \.html?$ {
    add_header Cache-Control "max-age=0, no-cache";
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## Мониторинг в Production

### Error tracking

```javascript
// Sentry или похожий сервис
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://xxx@xxx.ingest.sentry.io/xxx",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

### Analytics

```javascript
// Google Analytics или Yandex Metrica
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'GA_ID');
```

### Performance monitoring

```javascript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: vercel --prod
```

## Чек-лист перед production

- [ ] Все тесты проходят
- [ ] Нет console.log в продакшене
- [ ] Service Worker работает
- [ ] manifest.json валиден
- [ ] HTTPS включен
- [ ] CSP headers установлены
- [ ] API endpoints использует правильный базовый URL
- [ ] Error logging настроено
- [ ] Analytics интегрирована
- [ ] Backup & recovery план есть
- [ ] Мониторинг настроено
- [ ] Документация обновлена

## Rollback стратегия

```bash
# Если что-то сломается в production
git revert <commit-hash>
npm run build
npm run deploy
```

Или использовать blue-green deployment:
```
blue (текущая версия) ←← users
green (новая версия)

Если green работает → переключить
Если green ломается → остаться на blue
```

## Масштабирование

### CDN для статики
- Использовать CloudFlare, AWS CloudFront, или Akamai
- Кешировать все static assets

### Database scaling
- Если много пользователей → используйте PostgreSQL instead of JSON
- Кешируйте часто используемые данные (Redis)
- Используйте pagination для больших списков

### API Rate limiting
```javascript
// На сервере
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // 100 запросов за 15 минут
});

app.use("/api/", limiter);
```

## Обновления версий

### Уведомление о новой версии

```javascript
// index.html
let refreshing = false;

navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Новая версия доступна
          showUpdateNotification();
        }
      });
    });
  });
}

function showUpdateNotification() {
  const banner = document.createElement('div');
  banner.className = 'updateBanner';
  banner.innerHTML = `
    <p>Доступно обновление</p>
    <button onclick="window.location.reload()">Обновить</button>
  `;
  document.body.appendChild(banner);
}
```

## Резервное копирование

```javascript
// Периодически бэкапить данные юзеров
async function backupUserData() {
  const data = exportAllData();
  await fetch('/api/backup', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

setInterval(backupUserData, 1000 * 60 * 60); // Каждый час
```

---

**Вопросы?** See in modules comments or README.md
