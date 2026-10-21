# Техническая база

Проверено T-001 2026-10-21: исходный коммит `a6cc70c`, ветка `dev`. Текущий коммит нельзя открывать в production. Доказательства и результаты проверок: `docs/reports/T-001.md`.

## Стек и структура

Версии из lock-файлов: Next.js 16.1.6 App Router, React/React DOM 19.2.3, TypeScript 5.9.3; NestJS core 11.1.13, Prisma client/CLI/adapter-pg 7.4.0, PostgreSQL 16. Backend использует bcrypt 6 (cost 12), Passport JWT, Joi, class-validator/transformer, Helmet, throttler, Multer 2.0.2, sharp 0.34.5. Frontend: Tailwind 4, shadcn/ui/Radix, next-intl 4, next-themes, Zustand 5, Zod 4, sonner, Axios 1.13.5, Socket.IO; лендинг — GSAP/Framer Motion/Lenis/Three.js/R3F. Проверки: Jest 30 + ts-jest 29, ESLint 9.

Docker: node:22-alpine (оба приложения), postgres:16, nginx:alpine; digest/patch образов не закреплены. Локальная проверка: Windows PowerShell, Node v24.11.1, npm 11.16.0; результаты не подтверждают совместимость Alpine автоматически.

- Корень — отдельный npm-пакет dev-команд; frontend/backend имеют собственные package.json и lock. Workspaces нет.
- `backend/src/` — auth/users/catalog/settings/projects/rooms/products/calculations/uploads/sms/ws; shared — копирование каталогов/изделий, cron, Telegram.
- `backend/prisma/` — schema, seed, 24 SQL-миграции; prisma.config.ts задаёт datasource URL.
- `backend/uploads/` — в Git только .gitkeep.
- `frontend/src/app/` — лендинг/login/register/reset/dashboard/публичные КП; CRM — заглушка.
- Редактор: `frontend/src/app/dashboard/projects/[idProject]/[idRoom]/[idProduct]/`, hooks и editors рядом.
- `frontend/src/lib/` — Axios/ошибки/pricing/shorten; `types/index.ts` — frontend-типы; i18n/messages/{ru,kz}.json — переводы.
- `nginx/`, docker-compose.yml — production proxy и четыре сервиса. `.github/` и CI удалены.

## Команды

Запускать из указанного каталога. `.env` корня предназначен для Compose; локальный backend читает окружение/свой `.env`. PostgreSQL нужен отдельно.

| Каталог | Команда | Назначение |
|---|---|---|
| корень | `npm ci` | зависимости корневых dev-команд |
| backend | `npm ci` | установка по lock |
| frontend | `npm ci --legacy-peer-deps` | установка как в Dockerfile |
| backend | `npx --no-install prisma generate` | Client перед build/tests |
| backend | `npx --no-install prisma validate` | проверка schema |
| корень | `npm run dev` | frontend:3000/backend:4000 через concurrently |
| корень | `npm run dev:frontend` / `npm run dev:backend` | отдельный dev-сервер |
| backend | `npx prisma migrate dev --name <name>` | только разработка |
| backend | `npx prisma migrate deploy` | production SQL-миграции Prisma 7 |
| backend | `npx prisma db seed` | seed через ts-node, требует env |
| backend | `npm run build` | Nest → dist/src/main.js |
| backend | `npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --module commonjs --target ES2023 --skipLibCheck --resolveJsonModule` | компиляция seed как в Docker |
| backend | `node dist/src/main.js` | правильный entrypoint; start:prod ошибочно указывает dist/main |
| backend | `npm test -- --runInBand` | 94 unit-теста / 9 suites |
| backend | `npm run test:e2e -- --runInBand --forceExit` | один smoke-тест GET /; не проверяет БД и бизнес-сценарий |
| backend | `npx --no-install eslint "{src,apps,libs,test}/**/*.ts"` | без исправлений; npm run lint содержит --fix |
| frontend | `npm run build` | standalone, загрузка Geist/Geist Mono из Google Fonts |
| frontend | `npm run lint` | отдельный gate, next build ESLint не запускает |
| оба приложения | `npx --no-install tsc --noEmit --incremental false` | TypeScript |
| каждый из трёх пакетов | `npm audit --package-lock-only --json` | полный аудит |
| каждый пакет | `npm audit --omit=dev --package-lock-only --json` | дополнительная оценка production-графа |
| корень | `docker compose config --quiet` | синтаксис/интерполяция, не runtime |

install:all использует npm install и не устанавливает корневые зависимости. `docker compose up --build` не публикует HTTP локально: ports закомментированы. Нужен согласованный локальный port override либо Dokploy Domains.

## Соглашения и данные

Nest: module/controller/service/DTO. Глобальный ValidationPipe: whitelist/forbidNonWhitelisted/transform. Массовые компоненты принимаются через ParseArrayPipe; это не проверка ownership и максимальной длины массива.

Данные: User → Project → Room → Product → восемь видов компонентов. Calculation.data — JSON snapshot. Общий Material/Hardware имеет userId=null; custom — userId владельца. UserMaterial/UserHardware хранят цены/enabled/moduleTypes, UserService — услуги. Настройки КП: CompanyInfo/PaymentStage/UserContact. Регистрация копирует общий каталог через CatalogCopyService. ADMIN/SUPER управляют общим каталогом; SUPER — созданием пользователей. Роли SUPER/ADMIN/USER, статусы ACTIVE/INACTIVE/BLOCKED.

Access JWT: httpOnly cookie `/`, fallback Bearer; opaque refresh — randomBytes(64), хранится открытым в БД и cookie `/api/auth`. В production Secure/SameSite=Lax, TTL 15m/7d. JWT_REFRESH_SECRET требуется Joi, но фактически refresh не JWT. JwtStrategy проверяет статус/срок из БД, роль берёт из JWT. Force-logout через Socket.IO — UI-сигнал, не серверный отзыв access JWT.

Frontend Axios `/api`, credentials, 15s timeout, refresh mutex; отдельный axios refresh без timeout. Формы useState, alias @/* → src/*, локаль ru/kz в cookie, темизация next-themes. AuthGuard — UI, права нужны на сервере.

Публичное КП: Calculation ID без отдельного share-token/expiry; companySlug косметический. HTML загружается как Blob в iframe sandbox allow-scripts+allow-same-origin. Содержимое snapshot и настроек нельзя считать безопасным HTML.

Uploads: 50 MiB в памяти, extension/MIME/signature, sharp → WebP шириной до 500, `/app/uploads`; чтение публичное, UPLOAD_DIR фактически игнорируется. Cron: деактивация 00:05, refresh старше 30 дней в 03:00, SMS старше часа ежечасно. TZ не задана: ожидается UTC, не казахстанский бизнес-день.

## Инфраструктура и env

Traefik TLS → nginx:80 → frontend:3000/backend:4000 → postgres:5432. nginx: /api/, /socket.io/ с Upgrade, /uploads/ (30d cache), остальное Next. Next production rewrites отключены. Host ports отсутствуют, default network одна. В Dokploy Domains проверить Preview Compose: nginx должен видеть и Traefik, и backend/frontend. Выбрать isolated deployment либо явно сохранить private network плюс proxy network; автоматическую связность не предполагать.

onaymebel.kz и www.onaymebel.kz → nginx:80; рекомендуется www redirect на https://onaymebel.kz. deploy.onaymebel.kz → сама панель Dokploy. TLS/HTTPS redirect — Dokploy, сертификатов в приложении нет.

| Env | Требования |
|---|---|
| POSTGRES_USER/DB | явные простые идентификаторы |
| POSTGRES_PASSWORD | случайный длинный, не default; Compose вставляет без encoding, использовать URL-safe alphabet либо исправить URL |
| DATABASE_URL | локальные инструменты задают явно; Compose формирует сам с host postgres |
| JWT_SECRET/JWT_REFRESH_SECRET | разные случайные ≥32 байт; Joi проверяет лишь ≥16 символов |
| SUPER_ADMIN_PHONE/PASSWORD | явные +7XXXXXXXXXX / уникальный случайный ≥16 символов; seed идёт до Joi и содержит fallback |
| FRONTEND_URL | https://onaymebel.kz без slash; CORS разрешает один origin |
| NODE_ENV/PORT | Compose: production/4000 |
| JWT_ACCESS_EXPIRES/REFRESH_EXPIRES | 15m/7d; Joi не проверяет корректность duration |
| TELEGRAM_BOT_TOKEN/CHAT_ID | опционально, без обоих уведомления выключены |
| NEXT_PUBLIC_PRICE_MONTHLY/YEARLY | публичные build args 25000/240000, нужна пересборка |
| BODY_LIMIT | default 1024mb; Compose НЕ передаёт эту переменную |
| UPLOAD_DIR/APP_DOMAIN | первый игнорируется кодом пути, второй Compose не использует |

SMTP_* / NOTIFY_EMAIL есть в Joi, но действующего SMTP и передачи Compose нет. Старые NEXT_PUBLIC_API_URL/WS_URL кодом не используются. .dockerignore исключают .env*, node_modules, dist/.next/uploads. В Git только .env.example; поиск выбранных сигнатур секретов в дереве/истории ничего не обнаружил, абсолютной гарантии нет.

### Чистая база, старт и хранение

Postgres pg_isready → backend service_healthy → CMD `npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main.js`. Ошибка миграций/seed блокирует приложение, restart повторит цикл. frontend/nginx ждут только старта контейнера; healthcheck приложений нет. /api/health делает SELECT 1, но degraded тоже HTTP 200.

Volumes: pgdata:/var/lib/postgresql/data, backend_uploads:/app/uploads. Сохранить Compose project identity при redeploy; down -v уничтожает данные. Фиксированные container_name мешают второму окружению на том же host.

24 миграции: 20260212062653_init → 20260317165137_add_hinges_enabled. Последняя пустая, предыдущая добавляет колонку: двойного ADD нет. Исторические DROP ProductMezzanine/колонок не теряют прежние данные на пустой базе. Реальное применение SQL и schema drift не проверены: Linux Docker daemon/локальный PostgreSQL недоступны.

Seed создаёт SUPER ACTIVE до 2099, 8 типов комнат/8 изделий, 5 типов материалов/7 фурнитуры, 11 материалов/18 фурнитуры, шаблон услуг и копии администратору. Existing admin update={} — смена env-пароля не меняет пароль в БД, смена телефона создаёт ещё SUPER. Seed не безвредно идемпотентен: восстанавливает удалённый стартовый каталог, заполняет moduleTypes, перезаписывает UserMaterial.moduleTypes всех пользователей; копирует SUPER в том числе custom-каталоги без фильтра userId=null. Нет общей транзакции.

Docker backend после prune повторно ставит Prisma через npm install --no-save; финальное дерево не обеспечено только первоначальным npm ci, проверять фактический image отдельно. Compile seed и оба entrypoint локально проверены, Alpine runner не проверен.

Бэкапов нет: до production внешние pg_dump и uploads, retention и пробное восстановление. Обычный tar работающего pgdata не заменяет согласованный backup БД.

## Ресурсы 2 CPU / 2 GiB / 40 GB

Это бюджет, не замеры VPS. Dokploy требует минимум 2 GB RAM/30 GB disk, поэтому совместное приложение имеет малый запас.

- Runtime оценка: OS/Docker/Dokploy/его БД+Redis/Traefik 650–950 MiB; app PostgreSQL 200–350, backend 200–350, frontend 150–300, nginx 10–30. Итого примерно 1.2–2.0 GiB до пиков.
- Swap 4 GiB до сборки: mode 0600, mkswap/swapon, fstab, проверка после reboot; начальное swappiness=10. Не заменяет RAM/ограничения запросов.
- Сборки строго последовательно, один deployment одновременно; Next transient планировать 1–2+ GiB сверх runtime. Предпочтителен build вне VPS с доставкой образов. Runtime mem_limit не ограничивает BuildKit.
- Начальные app лимиты для испытания: PostgreSQL 384 MiB, backend 384 MiB/V8 old-space 256, frontend 320 MiB/old-space 192, nginx 64 MiB; миграции/seed проверить под теми же лимитами. PostgreSQL shared_buffers 64–128 MiB, work_mem 2–4 MiB, max_connections 20–30, pg pool 5–10; уточнить по замерам. Правило 25% RAM выделенной БД к shared VPS не применять.
- docker stats/free -h/vmstat 1, memory.events/OOMKilled, latency/5xx, df -h/docker system df. RAM warning 80%, disk 75%, critical 90%; перед build ≥8 GiB свободного диска/≥300 MiB MemAvailable. Постоянный swap-in/out/OOM запрещают открывать production.
- Диск: swap 4 GiB, OS/панель ~6–10, images ~4–8, build cache ~3–8; остальное данные/WAL и ≥8 GiB свободного резерва. Верхние оценки превышают 40 GB: нужны контроль и очистка. Логи 10m×3 на контейнер. После проверенного релиза оценить docker system df и выполнить docker builder prune --filter until=168h. Не удалять volumes/rollback images; внешние backups не копить на VPS.

## Известные проблемы / gates

Критично: item.id компонентов не ограничен изделием; uploads delete без owner; stored HTML/script injection в КП; unlimited nginx/1 GiB JSON backend и отсутствие структурных лимитов. Важно: vulnerable runtime dependencies; seed до проверки env и массовые изменения при рестарте; устаревающая роль JWT/неотозванный access после reset; trust proxy отсутствует; Telegram/clck.ru без timeout/response cap; номера телефонов в логах; SMS reset — заглушка. Нет app readiness/resource limits/backup runbook, сети Dokploy и чистые миграции не испытаны.

Проверки T-001: builds/TypeScript успешны; unit 94/94, smoke e2e 1/1. ESLint backend 1 error/789 warnings (unused updated в settings.service.ts:520), frontend 10 errors (refs 8, set-state-in-effect 2). Нет тестов calculations/products/uploads/tenant isolation. Нужна T-002 до деплоя, затем инфраструктурная проверка T-003.

## Источники

[Dokploy установка](https://docs.dokploy.com/docs/core/installation), [сети/Domains](https://docs.dokploy.com/docs/core/docker-compose/domains); [Docker startup](https://docs.docker.com/compose/how-tos/startup-order), [ресурсы/swap](https://docs.docker.com/engine/containers/resource_constraints/), [Compose](https://docs.docker.com/reference/compose-file/services/); [Node LTS](https://nodejs.org/en/about/previous-releases); [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [memory](https://nextjs.org/docs/app/guides/memory-usage); [Nest throttler/proxy](https://docs.nestjs.com/security/rate-limiting); [Prisma 7 requirements](https://www.prisma.io/docs/orm/v7/reference/system-requirements), [seed](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding); [PostgreSQL memory](https://www.postgresql.org/docs/16/runtime-config-resource.html), [backup](https://www.postgresql.org/docs/16/backup.html); [Ubuntu memory](https://documentation.ubuntu.com/security/security-features/process-memory/).
