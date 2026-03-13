# Полный промпт для AI-агента: разработка лендинга Onay Mebel

## Роль

Ты — **Senior Frontend Engineer, Creative Web Developer и Motion UI Designer**.

Твоя задача — создать **премиальный SaaS-лендинг с продвинутыми анимациями, 3D motion design и scroll-storytelling** для продукта **Onay Mebel**.

Лендинг должен выглядеть как технологический продукт уровня современных SaaS компаний и сайтов, публикуемых на Awwwards.

Контент лендинга уже написан.
Твоя задача — **реализовать UI, архитектуру страницы и motion-эффекты**, не переписывая тексты.

Основная цель лендинга — **конверсия посетителя в регистрацию**.

---

# Mobile-first архитектура (обязательно)

Лендинг должен проектироваться **mobile-first**.

Сначала создаётся версия для мобильных устройств, затем масштабируется для:

```
mobile → tablet → desktop
```

### Требования mobile-first

- минимальный layout shift
- быстрый первый рендер
- крупные кнопки (≥ 44px)
- удобные touch-interaction
- минимальная нагрузка на CPU

Hero должен помещаться **в первый экран на мобильных**.

---

# Mobile UX

На мобильных:

- вертикальный layout
- короткие блоки
- минимум текста
- быстрые анимации

Добавить **sticky CTA bar**.

После первого скролла появляется:

```
Попробовать бесплатно
7 дней бесплатно
```

---

# Технологический стек

Frontend:

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS

Анимации:

- GSAP
- Framer Motion

3D:

- Three.js

Дополнительно:

- smooth scrolling
- IntersectionObserver
- GPU accelerated animations

---

# Дизайн стиль

Интерфейс должен быть:

- современный SaaS
- минималистичный
- темный/светлый
- технологичный
- много воздуха

Вдохновение:

- Stripe
- Linear
- Vercel
- Apple product pages

---

# Motion design принципы

Все анимации должны:

- быть плавными
- не мешать чтению
- использовать easing

Использовать:

- fade + translate
- stagger animations
- subtle scale
- parallax
- scroll animations

---

# 3D motion design

Добавить **3D сцену в hero блоке (desktop only)**.

Использовать:

Three.js

Сцена должна содержать:

- панели мебели
- UI карточки интерфейса
- floating элементы

Поведение:

```
объекты медленно вращаются
камера слегка двигается
реакция на курсор
```

Дополнительно:

- depth blur
- light reflections
- floating motion

---

# Scroll storytelling

Использовать **GSAP ScrollTrigger**.

Прокрутка должна управлять анимациями.

Пример:

```
scroll ↓

hero исчезает
3D сцена трансформируется
появляется блок "До / После"
карточки появляются
```

---

# Структура лендинга

Использовать следующие секции:

```
Hero
До / После
Отзыв
Для кого Onay Mebel
Как это работает
Что внутри
Почему выбирают Onay Mebel
Тарифы
FAQ
Оплата
Финальный CTA
Footer
```

Каждая секция должна иметь **анимацию появления**.

---

# HERO SECTION

Контент:

Заголовок:

```
Расчет мебели за 5 минут — без Excel, без ошибок, с готовым КП для клиента
```

Подзаголовок:

```
Введите размеры, выберите материалы — система сама посчитает стоимость,
сформирует коммерческое предложение и отправит клиенту по ссылке.
```

Кнопки:

```
Попробовать бесплатно → /register
Смотреть видео — как это работает
```

Микротекст:

```
Кухни, шкафы, гардеробные, тумбы, комплексные проекты. 7 дней бесплатно.
```

### Hero motion

Добавить:

- stagger animation текста
- fade появления кнопок
- parallax background
- floating UI mockup
- 3D сцена

Анимация:

```
text reveal
buttons fade
3D rotation
UI cards float
```

---

# БЛОК "ДО / ПОСЛЕ"

Comparison table.

Анимация:

- строки появляются по очереди
- правая колонка подсвечивается

Цель:

показать **разницу Excel vs Onay Mebel**.

---

# ОТЗЫВ

Оформить как testimonial card.

Добавить:

- fade animation
- avatar placeholder
- hover lift.

---

# БЛОК "ДЛЯ КОГО"

Три карточки:

```
Мебельные производства
Салоны и дизайнеры
Руководители бизнеса
```

Анимации:

- stagger reveal
- hover lift
- icon animation.

---

# БЛОК "КАК ЭТО РАБОТАЕТ"

6 шагов.

Использовать **sticky scroll section**.

Поведение:

```
секция фиксируется
при скролле меняется активный шаг
```

Каждый шаг показывает **мини-демо интерфейса**.

---

# БЛОК "ЧТО ВНУТРИ"

Feature grid.

Карточки:

```
Конструктор изделий
Свой прайс-лист
Автоматический расчёт
КП за 1 клик
Встроенная CRM
```

Анимации:

- stagger reveal
- hover glow
- subtle motion.

---

# БЛОК "ПОЧЕМУ ВЫБИРАЮТ"

Секция сравнения проблем и решений.

Анимация:

- строки появляются при скролле
- правая колонка подсвечивается.

---

# ТАРИФЫ

3 pricing cards:

```
Старт
Бизнес
Про
```

Особенности:

- карточка "Бизнес" выделена
- hover lift
- subtle scale.

---

# FAQ

Accordion.

Анимация:

- smooth expand
- icon rotation.

---

# ОПЛАТА

Показать процесс оплаты через Kaspi.

UI:

```
Step 1
Step 2
Step 3
Step 4
```

Анимация:

- step reveal
- animated progress line.

---

# ФИНАЛЬНЫЙ CTA

Заголовок:

```
Хватит считать мебель в Excel.
Начните зарабатывать быстрее.
```

Кнопка:

```
Начать бесплатно
```

Анимация:

- fade
- background glow
- pulse button.

---

# Motion архитектура

Создать папку:

```
/animations
```

Файлы:

```
hero.ts
scroll.ts
cards.ts
sticky.ts
three-scene.ts
```

---

# Компоненты

Создать:

```
HeroSection
BeforeAfterSection
TestimonialSection
AudienceSection
HowItWorksSection
FeaturesSection
WhySection
PricingSection
FaqSection
PaymentSection
FinalCTASection
Footer
```

---

# Performance

Лендинг должен:

- иметь Lighthouse ≥ 90
- lazy loading
- оптимизированные изображения
- GPU animation.

---

# Responsive

Поддержка:

```
mobile
tablet
desktop
```

На мобильных:

- отключить тяжёлые 3D сцены
- оставить лёгкие motion анимации.

---

# Smooth scrolling

Добавить smooth scroll.

Можно использовать:

```
Lenis
или
GSAP ScrollSmoother
```

---

# Дополнительные визуальные эффекты

Добавить:

- glass UI элементы
- мягкие градиенты
- subtle shadows
- glow для CTA.

---
