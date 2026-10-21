# Техническая база

Проверено T-002 2026-10-22, ветка `dev`: критические границы tenant isolation, uploads, публичного КП и входных лимитов закрыты. Production всё ещё требует инфраструктурных gates из раздела «Известные проблемы / gates» и отчёта `docs/reports/T-002.md`.

## Стек и структура

Версии из lock-файлов: Next.js 16.4.2 App Router, React/React DOM 19.2.3, TypeScript 5.9.3; NestJS core/platform 11.1.18, Prisma client/CLI/adapter-pg 7.4.0, PostgreSQL 16. Backend использует bcrypt 6 (cost 12), Passport JWT, Joi 18.2.9, class-validator/transformer, Helmet, throttler, Multer 2.4.0, sharp 0.35.5, compression 1.8.2 и Socket.IO 4.8.4. Frontend: Tailwind 4, shadcn/ui/Radix, next-intl 4, next-themes, Zustand 5, Zod 4, sonner, Axios 1.20.0, sharp 0.35.5 и Socket.IO client 4.8.4; лендинг — GSAP/Framer Motion/Lenis/Three.js/R3F. Проверки: Jest 30 + ts-jest 29, ESLint 9.

Docker: node:22-alpine (оба приложения), postgres:16, nginx:alpine; digest/patch образов не закреплены. Локальная проверка: Windows PowerShell, Node v24.11.1, npm 11.16.0; результаты не подтверждают совместимость Alpine автоматически.

- Корень — отдельный npm-пакет dev-команд; frontend/backend имеют собственные package.json и lock. Workspaces нет.
- `backend/src/` — auth/users/catalog/settings/projects/rooms/products/calculations/uploads/sms/ws; shared — копирование каталогов/изделий, cron, Telegram.
- `backend/prisma/` — schema, seed, 25 SQL-миграций; prisma.config.ts задаёт datasource URL.
- `backend/uploads/` — в Git только .gitkeep; метаданные/владелец/размер хранятся в Prisma `Upload`, счётчики квот — в `User.uploadBytes` и singleton `UploadStorage`.
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
| backend | `npm test -- --runInBand` | unit и security-регрессии: 116 тестов / 12 suites |
| backend | `npm run test:e2e -- --runInBand --forceExit` | smoke и HTTP limits: 13 тестов / 4 suites; БД-сценарий не выполняется |
| backend | `npx --no-install eslint "{src,apps,libs,test}/**/*.ts"` | без исправлений; npm run lint содержит --fix |
| frontend | `npm run build` | standalone через официальный `next build --webpack`; загрузка Geist/Geist Mono из Google Fonts |
| frontend | `npm run lint` | отдельный gate, next build ESLint не запускает |
| оба приложения | `npx --no-install tsc --noEmit --incremental false` | TypeScript |
| каждый из трёх пакетов | `npm audit --package-lock-only --json` | полный аудит |
| каждый пакет | `npm audit --omit=dev --package-lock-only --json` | дополнительная оценка production-графа |
| корень | `docker compose config --quiet` | синтаксис/интерполяция, не runtime |

install:all использует npm install и не устанавливает корневые зависимости. `docker compose up --build` не публикует HTTP локально: ports закомментированы. Нужен согласованный локальный port override либо Dokploy Domains.

## Соглашения и данные

Nest: module/controller/service/DTO. Встроенный body parser отключён, до auth работает явный Express parser с лимитом JSON/urlencoded 2 MiB и `parameterLimit=1000`. Глобальный ValidationPipe: whitelist/forbidNonWhitelisted/transform. Строки/числа/массивы DTO имеют конечные границы; каждый из восьми component endpoints проверяет максимум 100 элементов до поэлементного `ParseArrayPipe`.

Данные: User → Project → Room → Product → восемь видов компонентов. Room/Product ищутся сразу по ID и владельцу, поэтому чужой и отсутствующий объект дают одинаковое «не найдено». Перед любым массовым обновлением сервер проверяет, что каждый переданный component ID принадлежит выбранному изделию; чужой и неизвестный ID также неразличимы. Выбранные material/hardware должны иметь enabled-связь текущего пользователя и быть общими (`userId=null`) либо его custom-записью. Calculation.data — JSON snapshot с лимитами 1.5 MB, depth 12, 200 элементов массива/ключей объекта, строкой до 5000 символов и 25 000 узлов. Общий Material/Hardware имеет userId=null; custom — userId владельца. UserMaterial/UserHardware хранят цены/enabled/moduleTypes, UserService — услуги. Настройки КП: CompanyInfo/PaymentStage/UserContact. Регистрация копирует общий каталог через CatalogCopyService. ADMIN/SUPER управляют общим каталогом; SUPER — созданием пользователей. Роли SUPER/ADMIN/USER, статусы ACTIVE/INACTIVE/BLOCKED.

Access JWT: httpOnly cookie `/`, fallback Bearer; opaque refresh — randomBytes(64), хранится открытым в БД и cookie `/api/auth`. В production Secure/SameSite=Lax, TTL 15m/7d. JWT_REFRESH_SECRET требуется Joi, но фактически refresh не JWT. JwtStrategy проверяет статус/срок из БД, роль берёт из JWT. Force-logout через Socket.IO — UI-сигнал, не серверный отзыв access JWT.

Frontend Axios `/api`, credentials, 15s timeout, refresh mutex; отдельный axios refresh без timeout. Формы useState, alias @/* → src/*, локаль ru/kz в cookie, темизация next-themes. AuthGuard — UI, права нужны на сервере.

Публичное КП: Calculation ID без отдельного share-token/expiry; companySlug косметический. Все текстовые HTML/attribute-контексты экранируются, inline JSON дополнительно заменяет `<`, `>`, `&`, U+2028/U+2029, ссылки строятся из allowlist contact type, изображения принимаются только как локальные `/uploads/...` и встраиваются data URI. Ответ содержит CSP sandbox/default-src none, а HTML — meta CSP для Blob/скачанного файла. Публичный и внутренний просмотр используют iframe `sandbox="allow-scripts allow-modals"` без `allow-same-origin`; печать, переключение вкладок и HTML-скачивание сохраняются.

Uploads: Multer отклоняет до сервиса больше 1 файла, лишние parts/fields и файл >5 MiB; memory buffer ограничен 5 MiB. Затем проверяются extension/MIME/magic bytes, sharp ограничивает 13 MP (обычное фото 12 MP помещается; декодированный RGBA ограничен примерно 52 MB) и конвертирует в неанимированный WebP шириной до 500. Имя — UUID, канонический URL `/uploads/<uuid>.webp`, каталог берётся из `UPLOAD_DIR`. Запись метаданных/квоты транзакционна; при ошибке файловой записи резерв откатывается. Лимиты хранения: 100 MiB на пользователя и 1 GiB суммарно по умолчанию. Удаление ищет запись по паре URL+userId, чужой/неизвестный URL возвращает одинаковый 404; ENOENT очищает рассинхронизированные метаданные. Чтение `/uploads/` остаётся публичным для КП. Cron: деактивация 00:05, refresh старше 30 дней в 03:00, SMS старше часа ежечасно. TZ не задана: ожидается UTC, не казахстанский бизнес-день.

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
| JSON_BODY_LIMIT_BYTES | default/max 2097152 (2 MiB); Compose передаёт явно |
| UPLOAD_USER_LIMIT_BYTES / UPLOAD_TOTAL_LIMIT_BYTES | defaults 100 MiB / 1 GiB; Joi допускает не более 1 GiB / 5 GiB |
| UPLOAD_DIR / APP_DOMAIN | первый задаёт единый путь записи/static/встраивания КП; второй Compose не использует |

SMTP_* / NOTIFY_EMAIL есть в Joi, но действующего SMTP и передачи Compose нет. Старые NEXT_PUBLIC_API_URL/WS_URL кодом не используются. .dockerignore исключают .env*, node_modules, dist/.next/uploads. В Git только .env.example; поиск выбранных сигнатур секретов в дереве/истории ничего не обнаружил, абсолютной гарантии нет.

### Чистая база, старт и хранение

Postgres pg_isready → backend service_healthy → CMD `npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main.js`. Ошибка миграций/seed блокирует приложение, restart повторит цикл. frontend/nginx ждут только старта контейнера; healthcheck приложений нет. /api/health делает SELECT 1, но degraded тоже HTTP 200.

Volumes: pgdata:/var/lib/postgresql/data, backend_uploads:/app/uploads. Сохранить Compose project identity при redeploy; down -v уничтожает данные. Фиксированные container_name мешают второму окружению на том же host.

25 миграций: 20260212062653_init → 20261021070000_secure_upload_ownership. Новая миграция добавляет `User.uploadBytes`, `Upload`, `UploadStorage`, уникальные URL/filename, индекс owner и FK cascade. `prisma generate`, `validate` и `migrate diff --from-empty --to-schema` проходят; реальное двукратное `migrate deploy` на чистой PostgreSQL остаётся обязательным gate, потому что локальный Docker daemon не запущен (`dockerDesktopLinuxEngine` pipe отсутствует), а `psql` не установлен.

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

## Зависимости и audit

Применимые публичным runtime-путям findings T-001 закрыты минимальными совместимыми обновлениями: Next 16.4.2, Multer 2.4.0, sharp 0.35.5, Axios 1.20.0, Socket.IO/client 4.8.4, Nest core/platform 11.1.18, compression 1.8.2, Joi 18.2.9 и точечные overrides `engine.io`, `socket.io-parser`, `ws`, `proxy-addr`, `form-data`, `source-map-js`. Lock-файлы обновлены; массовый `audit fix --force` не применялся.

После T-002 `npm audit --omit=dev`: корень 0; backend 17 (1 low/6 moderate/10 high); frontend 5 (1 low/3 moderate/1 high). Backend high — цепочка Prisma CLI (`@prisma/dev`/Hono/config parsers/mysql2), которую Docker запускает только для доверенных миграций до приложения: Hono server/MySQL/RPC/непроверенные templates публичным API не используются. Frontend high — `picomatch@4.0.3` через file watcher next-intl; пакет отсутствует в `.next/standalone` и не обрабатывает runtime-запросы. Полный audit дополнительно содержит dev-only Jest/ESLint/shadcn/ts-loader/Prisma findings; корневые critical `concurrently→shell-quote` существуют только в локальной dev-команде с фиксированными строками и не входят ни в один runtime image.

## Известные проблемы / gates

Критические findings T-001 по компонентам, uploads, КП и input/resource limits закрыты T-002. До production остаются отдельные задачи из исходного аудита: fail-closed/idempotent seed; актуальность роли JWT и отзыв access после reset; trust proxy/rate limit; timeout/cap Telegram и clck.ru; очистка логов от телефонов; решение по SMS reset; readiness/resource limits/backup runbook и сеть Dokploy. Share-token/expiry, TZ и бизнес-решения не менялись. `start:prod` всё ещё указывает `dist/main`, но production Docker запускает правильный `dist/src/main.js`.

Quality gate T-002: backend unit 116/116 и e2e 13/13; backend build/TypeScript/Prisma generate+validate/seed compile успешны; ESLint 0 errors и baseline 789 warnings. E2E assertions проходят, но существующий runner оставляет open handle, поэтому итоговая команда использует `--forceExit`. Frontend TypeScript/lint 0 errors (27 warnings); production build проходит Webpack. Next 16.4.2 Turbopack дважды падал на локальном Windows при старте PostCSS child process с exit 0, поэтому build script использует официально поддерживаемый `--webpack`; Docker будет выполнять тот же воспроизводимый script.

## Источники

[Dokploy установка](https://docs.dokploy.com/docs/core/installation), [сети/Domains](https://docs.dokploy.com/docs/core/docker-compose/domains); [Docker startup](https://docs.docker.com/compose/how-tos/startup-order), [ресурсы/swap](https://docs.docker.com/engine/containers/resource_constraints/), [Compose](https://docs.docker.com/reference/compose-file/services/); [Node LTS](https://nodejs.org/en/about/previous-releases); [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [memory](https://nextjs.org/docs/app/guides/memory-usage); [Nest throttler/proxy](https://docs.nestjs.com/security/rate-limiting); [Prisma 7 requirements](https://www.prisma.io/docs/orm/v7/reference/system-requirements), [seed](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding); [PostgreSQL memory](https://www.postgresql.org/docs/16/runtime-config-resource.html), [backup](https://www.postgresql.org/docs/16/backup.html); [Ubuntu memory](https://documentation.ubuntu.com/security/security-features/process-memory/).

T-002: [Nest file upload/ранний Multer limit](https://docs.nestjs.com/techniques/file-upload), [Multer security guidance и changelog 2.4.0](https://github.com/expressjs/multer/blob/main/CHANGELOG.md), [Express body-parser limit](https://expressjs.com/en/resources/middleware/body-parser/), [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe), [Next CLI `--webpack`](https://nextjs.org/docs/app/api-reference/cli/next), [Prisma 7 migrate deploy](https://www.prisma.io/docs/cli/v7/migrate/deploy), [Next Server Components advisory](https://github.com/vercel/next.js/security/advisories/GHSA-h25m-26qc-wcjf), [sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), [Axios 1.20 advisory](https://github.com/advisories/GHSA-542g-h47m-68v8), [Socket.IO security history](https://github.com/socketio/socket.io/blob/main/SECURITY.md).
