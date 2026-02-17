# Onay Mebel — Copilot Instructions

## Архитектура

Монорепо: **Next.js 16 (App Router)** + **NestJS 11** + **PostgreSQL 16** + **Prisma ORM 6**. Nginx — reverse proxy в Docker. Предметная область — калькулятор мебели: каталог → пользовательские цены → проекты → комнаты → изделия → расчёт (3 тира) → HTML коммерческое предложение.

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

cd backend && npm test           # jest unit
cd backend && npm run test:e2e   # jest e2e

docker compose up --build        # postgres + backend + frontend + nginx
```

## Backend (NestJS)

### Структура модулей

Каждый NestJS-модуль = `{module, controller, service, dto/}`. Ключевые модули: `auth`, `catalog`, `settings`, `projects`, `rooms`, `products`, `calculations`, `uploads`, `users`, `ws`.

### Auth

- JWT в httpOnly cookies (`accessToken` path=`/`, `refreshToken` path=`/api/auth`), fallback на `Authorization: Bearer` header.
- `@UseGuards(JwtAuthGuard)` на **класс** контроллера, `@Roles('ADMIN') @UseGuards(RolesGuard)` на **метод**. Роли: `SUPER`, `ADMIN`, `USER`.
- Доступ к пользователю: `@Req() req: any` → `req.user.id` (payload: `{ sub, phone, role }`). Нет кастомного `@CurrentUser` декоратора.
- Refresh token — случайная строка 64 bytes hex в БД (`RefreshToken`), ротация при refresh, лимит 5 токенов на пользователя.
- При логине: `WsGateway.forceLogout(userId)` — force-logout предыдущей сессии через Socket.IO.
- Rate limiting: `@Throttle()` на auth-эндпоинтах (3-5 req/min). Глобальный `ThrottlerGuard` (10 req/s, 100 req/min).

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

### Утилиты

- `toNum()` — `Prisma.Decimal → number`, fallback 0 на null/undefined (в `calculations.service.ts`).
- `parseDurationMs()` — конвертация JWT duration строки в мс (в `auth.controller.ts`).

### WebSocket

Socket.IO **только** для force-logout. `WsGateway` хранит `Map<userId, Set<socketId>>`.

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
- Нет `NEXT_PUBLIC_*` env-переменных. WS URL формируется runtime из `window.location`.

### State

Zustand v5, один стор `auth.store.ts`. Persist вручную в localStorage + Zod v4 (`z from "zod/v4"`) валидация при `loadFromStorage()`. `loadFromStorage()` вызывается в `AuthGuard`.

### i18n

`next-intl` v4, локали `ru`/`kz`, cookie-based (cookie `locale`, без URL-сегментов). Переключение: `document.cookie = \`locale=...\``+`router.refresh()`. Переводы в `src/i18n/messages/{ru,kz}.json`. Использование: `const t = useTranslations()`.

### UI

- shadcn/ui (`new-york`), Tailwind CSS v4 (oklch), lucide-react иконки, `cn()` из `@/lib/utils`.
- Toast: sonner — `toast.success()`, `toast.error()`, position `top-right`.
- Темы: `next-themes` с class-based toggling, light/dark через `.dark`.
- Шрифты: Geist Sans + Geist Mono.

### Паттерн данных (все dashboard-страницы)

```typescript
"use client";
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const fetchData = useCallback(async () => {
  try {
    setItems((await api.get("/...")).data);
  } catch {
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
- Ошибки API: `getApiError(err, fallback)` из `@/lib/api-error.ts` — извлекает `message` из axios response.
- Loading: skeleton на `animate-pulse`.

### Роутинг

- `(public)/proposal` — без auth, публичное КП.
- `/dashboard` — с `<AuthGuard>`, desktop sidebar 264px + mobile bottom tabs.
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
User ─1:N─ PaymentStage, UserContact, RefreshToken
```

IDs — `cuid()`. Все модели: `createdAt`/`updatedAt`. Каскадное удаление: `onDelete: Cascade`. Субкомпоненты имеют **опциональный** `mezzanineId` — размещение и на изделии, и на антресоли через одну таблицу.

Enums: `Role(SUPER/ADMIN/USER)`, `UserStatus(ACTIVE/INACTIVE/BLOCKED)`, `CalcType(SHEET/SQM/LM)`, `ProfitType(COEF/FIXED)`, `FacadeOpenType(HANDLE/TIP_ON)`, `DrawerSlideType(GUIDE/TANDEM)`.

## Расчётный движок (`calculations.service.ts`)

Файл ~2600 строк. Ключевые методы: `calculate(projectId, userId)` → сохраняет snapshot в `Calculation.data` (JSON), `generateProposal(data, settings)` → self-contained HTML с CSS/JS.

**Три уровня цен:** чистая (материалы + фурнитура + 10% резерв) → цеховая (+ распил × листы + присадка × листы + кромка × м.п.) → рыночная (COEF: `sum × коэффициент` или FIXED: `sum + наценка`).

**Tier-система:** `computeTierPrices()` группирует материалы по `materialType`, сортирует по цене → `sorted[0]` = Standard, `sorted[median]` = Comfort, `sorted[last]` = Premium. При < 2 материалов — все тиры одинаковые.

## Инфраструктура

- **Docker:** postgres:16, backend (node:20-alpine, 2-stage, `dumb-init`), frontend (3-stage standalone), nginx:alpine. Traefik labels для TLS.
- **Backend CMD:** `prisma migrate deploy && node seed.js && node main.js` — автомиграции + seed при каждом запуске.
- **Nginx:** `/api/*` → backend, `/socket.io/` → backend (WS upgrade), `/uploads/` → backend (30d cache), `/` → frontend.
- **Uploads:** на диск `backend/uploads/`, ≤5 МБ, jpg/png/webp/gif.
- **Env:** обязательные — `DATABASE_URL`, `JWT_SECRET` (min 16), `JWT_REFRESH_SECRET` (min 16), `SUPER_ADMIN_PHONE`, `SUPER_ADMIN_PASSWORD` (min 8). Валидация через Joi в `ConfigModule`.
- **Seed:** idempotent (upsert) — создаёт super admin, типы комнат/изделий/материалов/фурнитуры, дефолтные материалы и услуги.
