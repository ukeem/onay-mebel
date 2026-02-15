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

| Secret         | Значение                                     |
| -------------- | -------------------------------------------- |
| `VPS_HOST`     | IP-адрес VPS (например `185.x.x.x`)         |
| `VPS_USER`     | Пользователь SSH (например `root`)           |
| `VPS_SSH_KEY`  | Приватный SSH-ключ (содержимое файла ключа)  |
| `VPS_PORT`     | Порт SSH (по умолчанию `22`)                 |

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
