# Деплой на VPS

## Требования

- VPS с Ubuntu 22.04+ (минимум 1 GB RAM, 20 GB SSD)
- Домен (опционально, можно по IP)

---

## 1. Подготовка сервера

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker и Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# ⚠️ Перезайти в SSH после этого

# Установить Git
sudo apt install -y git
```

## 2. Клонировать проект

```bash
cd ~
git clone git@github.com:ukeem/onay-mebel.git
cd onay-mebel
```

## 3. Настроить переменные окружения

```bash
cp .env.example .env
nano .env
```

Заполнить все значения (см. `.env.example`). Для генерации секретов:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 16   # POSTGRES_PASSWORD
```

## 4. Первый запуск

```bash
docker compose up -d --build
```

Сайт будет доступен на `http://YOUR_IP`.

Проверить статус:

```bash
docker compose ps
docker compose logs -f
```

## 5. Настроить автодеплой через GitHub Actions

В репозитории: **Settings → Secrets and variables → Actions → New repository secret**

| Secret        | Значение                                    |
| ------------- | ------------------------------------------- |
| `VPS_HOST`    | IP-адрес VPS (например `185.x.x.x`)         |
| `VPS_USER`    | Пользователь SSH (например `root`)          |
| `VPS_SSH_KEY` | Приватный SSH-ключ (содержимое файла ключа) |
| `VPS_PORT`    | Порт SSH (по умолчанию `22`)                |

### Генерация SSH-ключа для деплоя

```bash
# На локальной машине
ssh-keygen -t ed25519 -C "deploy" -f ~/.ssh/deploy_key -N ""

# Добавить публичный ключ на VPS
ssh-copy-id -i ~/.ssh/deploy_key.pub user@YOUR_VPS_IP

# Скопировать приватный ключ → вставить в GitHub Secret VPS_SSH_KEY
cat ~/.ssh/deploy_key
```

## Как работает деплой

```
git push main → GitHub Actions CI (lint, test, build) → Deploy → SSH на VPS → git pull + docker compose up --build
```

Каждый `push` в `main` автоматически пересобирает и перезапускает контейнеры на VPS.

---

## Полезные команды на VPS

```bash
# Статус контейнеров
docker compose ps

# Логи всех сервисов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f backend

# Перезапуск
docker compose restart

# Полная пересборка
docker compose down && docker compose up -d --build

# Очистка неиспользуемых образов
docker image prune -f

# Доступ к базе данных
docker compose exec postgres psql -U postgres -d onay_mebel

# Выполнить миграции вручную
docker compose exec backend npx prisma migrate deploy
```

## SSL (HTTPS) — опционально

Для HTTPS с Let's Encrypt добавьте Certbot или используйте Cloudflare proxy.

---

## Деплой через Dokploy (альтернативный способ)

[Dokploy](https://dokploy.com) — самохостящийся PaaS с веб-панелью, автодеплоем, SSL и мониторингом из коробки.

### 1. Установить Dokploy на VPS

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

После установки панель доступна на `http://YOUR_IP:3000`. Создайте аккаунт администратора.

### 2. Подключить GitHub

**Settings → Git Sources → GitHub** → авторизоваться и дать доступ к репозиторию `ukeem/onay-mebel`.

### 3. Создать проект

1. **Projects → Create Project** → имя: `onay-mebel`
2. **Create Service → Compose** → тип: `Docker Compose`
3. Источник: **GitHub** → репозиторий `ukeem/onay-mebel`, ветка `main`
4. **Compose Path**: `./docker-compose.dokploy.yml`
5. Сохранить

### 4. Настроить переменные окружения

Во вкладке **Environment** добавить:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=сгенерировать_пароль
POSTGRES_DB=onay_mebel

JWT_SECRET=сгенерировать_секрет
JWT_REFRESH_SECRET=сгенерировать_секрет

SUPER_ADMIN_PHONE=+77001234567
SUPER_ADMIN_PASSWORD=надёжный_пароль

DOMAIN=your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_WS_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
```

### 5. Настроить домен

Во вкладке **Domains** (или через Traefik-лейблы в compose-файле):

- Указать домен, направить A-запись DNS на IP сервера
- SSL-сертификат Let's Encrypt будет выпущен автоматически

### 6. Деплой

Нажать **Deploy**. Dokploy клонирует репо, выполнит `docker compose build` и запустит контейнеры.

### Автодеплой

Во вкладке **General → Auto Deploy** включить автодеплой. Каждый `push` в `main` будет автоматически деплоиться.

### Мониторинг и логи

Всё доступно через веб-панель Dokploy:

- **Logs** — логи каждого сервиса
- **Monitoring** — CPU, RAM, сеть
- **Deployments** — история деплоев
