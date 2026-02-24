# Onay Mebel — Copilot Instructions

## Архитектура

Монорепо: **Next.js 16 (App Router)** + **NestJS 11** + **PostgreSQL 16** + **Prisma ORM 7** (`@prisma/adapter-pg`). Nginx — reverse proxy в Docker. Деплой через **Dokploy** (Traefik TLS). Предметная область — калькулятор мебели: каталог → пользовательские цены → проекты → комнаты → изделия → расчёт (3 тира) → HTML коммерческое предложение.

**Data flow:** Admin создаёт каталог (`Material`, `Hardware`, `ServiceTemplate`) → при регистрации `CatalogCopyService` (`backend/src/shared/catalog-copy.service.ts`) копирует в `UserMaterial`/`UserHardware`/`UserService` через `createMany({ skipDuplicates: true })` → пользователь строит `Project → Room → Product` (с субкомпонентами) → `CalculationsService.calculate()` генерирует расчёт и HTML-предложение.

## Команды

```bash
npm run dev                      # concurrent frontend:3000 + backend:4000
npm run dev:frontend             # только фронтенд
npm run dev:backend              # только бэкенд
npm run install:all              # установка зависимостей обоих пакетов

cd backend && npx prisma migrate dev --name <name>
cd backend && npx prisma db seed # idempotent — безопасно повторять
cd backend && npx prisma studio

cd backend && npm test           # jest unit (94 теста, 9 suites)
cd backend && npm run test:e2e   # jest e2e

docker compose up --build        # postgres + backend + frontend + nginx
```

## Backend (NestJS)

### Структура модулей

Каждый NestJS-модуль = `{module, controller, service, dto/}`. Ключевые модули: `auth`, `catalog`, `settings`, `projects`, `rooms`, `products`, `calculations`, `uploads`, `users`, `ws`.

### Shared-модуль (`backend/src/shared/`)

- `catalog-copy.service.ts` — копирование каталога новому пользователю при регистрации.
- `cleanup.service.ts` — cron-задачи (`@nestjs/schedule`): очистка expired RefreshToken (ежедневно в 3:00), expired SmsCode (ежечасно).
- `copy-product.util.ts` — глубокое копирование Product со всеми субкомпонентами внутри Prisma-транзакции. Используется в projects/rooms/products сервисах.
- `parse-duration.util.ts` — конвертация JWT duration строки (`15m`, `7d`) в мс.

### Auth

- JWT в httpOnly cookies (`accessToken` path=`/`, `refreshToken` path=`/api/auth`), fallback на `Authorization: Bearer` header.
- `@UseGuards(JwtAuthGuard)` на **класс** контроллера, `@Roles('ADMIN') @UseGuards(RolesGuard)` на **метод**. Роли: `SUPER`, `ADMIN`, `USER`.
- Доступ к пользователю: `@Req() req: any` → `req.user.id` (payload: `{ sub, phone, role }`, после `validate()` → `{ id, phone, role }`). Нет кастомного `@CurrentUser` декоратора.
- Refresh token — случайная строка 64 bytes hex в БД (`RefreshToken`), ротация при refresh, лимит 5 токенов на пользователя.
- При логине: `WsGateway.forceLogout(userId)` — force-logout предыдущей сессии через Socket.IO.
- Rate limiting: `@Throttle()` на auth-эндпоинтах (3-10 req/min). Глобальный `ThrottlerGuard` (10 req/s, 100 req/min).

### DTOs

`class-validator` + `class-transformer`, один файл на модуль. Субкомпоненты — **отдельные DTO + отдельные PUT-эндпоинты**, без `@ValidateNested`. Глобальный `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.

### Ownership

Всегда проверяется через цепочку `product → room → project → userId`:

```typescript
// products.service.ts
private async ensureProductOwner(productId, userId) {
  const product = await this.prisma.product.findUnique({
    where: { id: productId },
    include: { room: { include: { project: true } } },
  });
  if (!product) throw new NotFoundException('Изделие не найдено');
  if (product.room.project.userId !== userId) throw new ForbiddenException('Нет доступа');
}
```

### Upsert-паттерн для субкомпонентов

Все массовые PUT-эндпоинты (`/api/products/:id/sections`, `/facades`, `/drawers`, `/shelves`, `/partitions`, `/extras`):

```
$transaction → deleteMany(where: { productId, id: { notIn: keepIds } }) → update existing (if id) → create new (if !id)
```

1:1 субкомпоненты (`/mezzanine`, `/countertop`) — upsert одного объекта + DELETE-эндпоинт.

### Ошибки

Сообщения на русском: `'Проект не найден'`, `'Нет доступа'`, `'Пользователь заблокирован'`. Exceptions: `NotFoundException`, `ForbiddenException`, `BadRequestException`. `AllExceptionsFilter` скрывает stack trace в production.

### Health check

`GET /api/health` — проверяет соединение с БД через `$queryRaw\`SELECT 1\``, возвращает `{ status: 'ok'|'degraded', uptime, db }`.

### WebSocket

Socket.IO **только** для force-logout. `WsGateway` хранит `Map<userId, Set<socketId>>`.

### Uploads

`backend/src/uploads/uploads.service.ts` — файлы на диск `backend/uploads/`, ≤5 МБ, jpg/png/webp/gif. **Тройная валидация:** расширение + MIME-тип + magic bytes (file signature). Path traversal защита через `path.resolve()` проверку.

## Frontend (Next.js)

### API-клиент (`src/lib/api.ts`)

```typescript
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 15_000,
});
```

- Relative URLs — nginx проксирует в prod, `next.config.ts` rewrites в dev.
- Auto-refresh на 401 с mutex (`refreshPromise`), redirect на `/login` при неудаче.
- Обработка 403 INACTIVE/BLOCKED на не-auth эндпоинтах → redirect на `/login`.
- Нет `NEXT_PUBLIC_*` env-переменных.

### Ключевые lib-утилиты (`src/lib/`)

- `api.ts` — Axios instance с interceptors (401 refresh, 403 redirect).
- `api-error.ts` — `getApiError(err, fallback)` — извлекает `message` из axios response.
- `constants.ts` — `API_BASE_URL` (пустая строка), `WS_BASE_URL` (runtime из `window.location`).
- `phone-mask.ts` — `formatPhone()` / `rawPhone()` для казахстанских номеров (+7 7XX XXX XX XX).
- `utils.ts` — `cn()` (tailwind-merge + clsx).

### Hooks (`src/hooks/`)

- `use-force-logout.ts` — подключение к Socket.IO для получения force-logout сигнала.
- `use-format-date.ts` — форматирование дат с учётом i18n-локали (ru-RU / kk-KZ).

### Types (`src/types/index.ts`)

Единый файл типов (~273 строки). Все типы импортируются через `@/types`. Включает: `Role`, `UserStatus`, `CalcType`, `ProfitType`, `FacadeOpenType`, `DrawerSlideType`, `ContactType`, `Tier` + интерфейсы всех сущностей.

### State

Zustand v5, один стор `auth.store.ts`. Persist вручную в localStorage + Zod v4 (`z from "zod/v4"`) валидация при `loadFromStorage()`. `loadFromStorage()` вызывается в `AuthGuard`.

### i18n

`next-intl` v4, локали `ru`/`kz`, cookie-based (cookie `locale`, без URL-сегментов). Переключение: `document.cookie = \`locale=...\``+`router.refresh()`. Переводы в `src/i18n/messages/{ru,kz}.json`. Использование: `const t = useTranslations()`.

### UI

- shadcn/ui (`new-york`), Tailwind CSS v4 (oklch), lucide-react иконки, `cn()` из `@/lib/utils`.
- Toast: sonner — `toast.success()`, `toast.error()`, position `top-right`.
- Темы: `next-themes` с class-based toggling, light/dark через `.dark`.
- Шрифты: Geist Sans + Geist Mono.
- Компоненты каталога (`src/components/catalog/`): `materials-crud.tsx`, `hardware-crud.tsx`, `service-template-crud.tsx`, `type-crud.tsx` — переиспользуемые CRUD для admin-панели.

### Паттерн данных (все dashboard-страницы)

```typescript
"use client";
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const fetchData = useCallback(async () => {
  try {
    setItems((await api.get("/...")).data);
  } catch (err) {
    toast.error(getApiError(err, t("common.error")));
  } finally {
    setLoading(false);
  }
}, [t]);
useEffect(() => {
  fetchData();
}, [fetchData]);
```

- Формы: нативный `useState`, без react-hook-form.
- CRUD: `<Dialog>` модалки, подтверждение через `<ConfirmDialog>` (управление через `deleteId` state).
- Loading: skeleton на `animate-pulse`.

### Роутинг

- `(public)/proposal/[idDetail]` — без auth, публичное КП.
- `/dashboard` — с `<AuthGuard>`, desktop sidebar 264px + mobile bottom tabs.
- `/dashboard/projects/[idProject]/[idRoom]/[idProduct]` — вложенный routing до изделия.
- `/dashboard/projects/[idProject]/details/[idDetail]/proposal` — предпросмотр КП.
- ADMIN/SUPER видят дополнительные пункты навигации (`catalog`, `users`).
- Path alias: `@/*` → `./src/*`.

## Prisma-схема

```
User ─1:N─ Project ─1:N─ Room ─1:N─ Product
                                       ├─ 1:N Section (опц. mezzanineId)
                                       ├─ 1:N Partition (опц. mezzanineId)
                                       ├─ 1:N Shelf (опц. mezzanineId)
                                       ├─ 1:N Facade (опц. mezzanineId)
                                       ├─ 1:N Drawer (опц. mezzanineId)
                                       ├─ 1:1 Mezzanine (имеет свои sub-компоненты)
                                       ├─ 1:1 Countertop
                                       └─ 1:N Extra

User ─1:N─ UserMaterial → Material → MaterialType
User ─1:N─ UserHardware → Hardware → HardwareType
User ─1:1─ UserService
User ─1:1─ CompanyInfo
User ─1:N─ PaymentStage, UserContact, RefreshToken, SmsCode
```

IDs — `cuid()`. Все модели: `createdAt`/`updatedAt`. Каскадное удаление: `onDelete: Cascade`. Субкомпоненты имеют **опциональный** `mezzanineId` — размещение и на изделии, и на антресоли через одну таблицу.

Enums: `Role(SUPER/ADMIN/USER)`, `UserStatus(ACTIVE/INACTIVE/BLOCKED)`, `CalcType(SHEET/SQM/LM)`, `ProfitType(COEF/FIXED)`, `FacadeOpenType(HANDLE/TIP_ON)`, `DrawerSlideType(GUIDE/TANDEM)`.

## Расчётный движок (`calculations.service.ts`)

Файл ~2600 строк. Ключевые методы: `calculate(projectId, userId)` → сохраняет snapshot в `Calculation.data` (JSON), `generateProposal(data, settings)` → self-contained HTML с CSS/JS.

**Три уровня цен:** чистая (материалы + фурнитура + 10% резерв) → цеховая (+ распил × листы + присадка × листы + кромка × м.п.) → рыночная (COEF: `sum × коэффициент` или FIXED: `sum + наценка`).

**Tier-система:** `computeTierPrices()` группирует материалы по `materialType`, сортирует по цене → `sorted[0]` = Standard, `sorted[median]` = Comfort, `sorted[last]` = Premium. При < 2 материалов — все тиры одинаковые.

## Инфраструктура

- **Docker:** postgres:16, backend (node:22-alpine, 2-stage, `dumb-init`), frontend (3-stage standalone), nginx:alpine.
- **Dokploy:** Traefik labels на nginx-контейнере, порты через `expose` (не `ports`). PostgreSQL не открыт наружу.
- **Backend CMD:** `prisma migrate deploy && node seed.js && node main.js` — автомиграции + seed при каждом запуске. Seed idempotent (upsert).
- **CORS:** production — только `FRONTEND_URL`; dev — `origin: true`.
- **Nginx:** `/api/*` → backend, `/socket.io/` → backend (WS upgrade), `/uploads/` → backend (30d cache), `/` → frontend.
- **Env:** см. `.env.example`. Обязательные: `DATABASE_URL`, `JWT_SECRET` (min 16), `JWT_REFRESH_SECRET` (min 16), `SUPER_ADMIN_PHONE`, `SUPER_ADMIN_PASSWORD` (min 8). Валидация через Joi в `ConfigModule`.
