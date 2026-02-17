# Onay Mebel — Copilot Instructions

## Архитектура

Монорепо: **Next.js 16 (App Router)** + **NestJS 11** + **PostgreSQL** + **Prisma ORM**. Nginx — reverse proxy в Docker. Предметная область — калькулятор мебели: каталог материалов/фурнитуры → пользовательские настройки (цены) → проекты → комнаты → изделия → расчёт (3 тира: Standard/Comfort/Premium) → коммерческое предложение.

**Ключевой data flow:** Admin создаёт каталог (`Material`, `Hardware`, `ServiceTemplate`) → при регистрации `CatalogCopyService` копирует каталог в `UserMaterial`/`UserHardware`/`UserService` с возможностью индивидуальных цен → пользователь строит `Project → Room → Product` (с субкомпонентами: секции, фасады, ящики, полки, антресоль, столешница) → `CalculationsService.calculate()` генерирует детализированный расчёт и HTML-предложение.

## Команды для разработки

```bash
# Запуск всего (concurrent frontend:3000 + backend:4000)
npm run dev                      # из корня

# Только фронтенд / бэкенд
npm run dev:frontend             # из корня
npm run dev:backend              # из корня

# Установка зависимостей
npm run install:all              # из корня

# Prisma
cd backend && npx prisma migrate dev --name <name>
cd backend && npx prisma db seed
cd backend && npx prisma studio

# Тесты (backend)
cd backend && npm test           # unit
cd backend && npm run test:e2e   # e2e

# Docker (production)
docker compose up --build        # postgres + backend + frontend + nginx
```

## Backend-конвенции (NestJS)

- **DTOs:** `class-validator` + `class-transformer`, один файл на модуль (напр. `products.dto.ts`). Субкомпоненты (фасады, ящики) — отдельные DTO + отдельные эндпоинты, без `@ValidateNested`.
- **Auth:** JWT в httpOnly cookies (`accessToken`), fallback на `Authorization: Bearer`. Guards: `@UseGuards(JwtAuthGuard)` на класс, `@Roles('ADMIN')` + `@UseGuards(RolesGuard)` на методы. Роли: `SUPER`, `ADMIN`, `USER`.
- **Доступ к user:** `@Req() req: any` → `req.user.id` (без кастомного декоратора `@CurrentUser`).
- **Ownership:** всегда проверяется через цепочку `product → room → project → userId` (см. `ensureRoomOwner()`, `ensureProductOwner()`).
- **Upsert-паттерн** для массовых субкомпонентов: `$transaction` → `deleteMany(notIn: keepIds)` → update existing → create new.
- **Ошибки:** сообщения на русском (`'Проект не найден'`, `'Нет доступа'`). NestJS exceptions: `NotFoundException`, `ForbiddenException`, `BadRequestException`.
- **Decimal:** утилита `toNum()` для конвертации `Prisma.Decimal → number`.
- **Env-валидация:** Joi в `ConfigModule.forRoot()` — см. `app.module.ts`.
- **WebSocket:** Socket.IO только для force-logout. `WsGateway` хранит `Map<userId, Set<socketId>>`.

## Frontend-конвенции (Next.js)

- **API-клиент:** axios (`@/lib/api.ts`), `withCredentials: true`, relative URLs (`/api/...`). nextConfig rewrites проксируют `/api/*` и `/uploads/*` на бэкенд в dev. Auto-refresh на 401 с mutex.
- **State:** Zustand v5, один стор `auth.store.ts`, persist вручную в localStorage с Zod v4 валидацией при восстановлении.
- **i18n:** `next-intl` v4, локали `ru`/`kz`, cookie-based (без сегментов в URL). Переводы в `src/i18n/messages/{ru,kz}.json`. Использование: `const t = useTranslations()`.
- **UI:** shadcn/ui (стиль `new-york`), Tailwind CSS v4, lucide-react иконки. `cn()` из `@/lib/utils`. Toast через sonner: `toast.success()`, `toast.error()`.
- **Страницы:** route groups — `(public)/proposal` (без auth), `/dashboard` (с `AuthGuard`). CRUD через модальные `<Dialog>`, подтверждение через `<ConfirmDialog>`.
- **Формы:** нативные `useState`, без react-hook-form. Ошибки API — `getApiError()` из `@/lib/api-error.ts`.
- **Компоненты:** `"use client"` для интерактивных, `useEffect` + `useCallback` для загрузки данных.
- **Path alias:** `@/*` → `./src/*`.

## Prisma-схема

Ключевые модели: `User` → `Project` → `Room` → `Product` → субкомпоненты (`ProductSection`, `ProductFacade`, `ProductShelf`, `ProductDrawer`, `ProductPartition`, `ProductMezzanine`, `ProductCountertop`, `ProductExtra`). Каталог: `Material` (с `MaterialType`), `Hardware` (с `HardwareType`), `ServiceTemplate`. Пользовательские копии: `UserMaterial`, `UserHardware`, `UserService`. IDs — `cuid()`. Все модели имеют `createdAt`/`updatedAt`.

## Расчётный движок (`calculations.service.ts`)

Файл ~1900 строк, ключевой сервис. Три уровня цен: **чистая** (материалы + фурнитура), **цеховая** (распил + присадка + кромка), **рыночная** (profit: COEF или FIXED). Три тира (Standard/Comfort/Premium) — автоматическая группировка материалов по `materialType` и выбор по цене. `generateProposal()` формирует полный self-contained HTML с CSS/JS.

## Инфраструктура

- **Docker:** 4 сервиса — `postgres:16`, `backend`, `frontend` (`output: "standalone"`), `nginx:alpine`.
- **Nginx:** `/api/*` → backend:4000, `/socket.io/` → backend (WebSocket upgrade), `/uploads/` → backend (static), `/` → frontend:3000.
- **Uploads:** файлы на диск `backend/uploads/`, ≤5 МБ, форматы jpg/png/webp/gif.
