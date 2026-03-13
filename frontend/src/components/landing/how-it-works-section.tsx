"use client";

import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Calculator,
  FolderOpen,
  Home,
  Layers,
  LayoutGrid,
  Send,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const STEP_ICONS = [FolderOpen, Home, Layers, Calculator, Send, Users];

/* ── Step 1: Create project modal ── */
function MockStep1() {
  return (
    <div className="p-5 min-h-[360px] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">Новый проект</h3>
          <X className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-[11px] font-medium text-foreground/70 mb-1">
              Название
            </div>
            <div className="h-9 rounded-lg border border-border bg-background px-3 flex items-center">
              <span className="text-xs text-muted-foreground/50">
                ЖК «Вавилон», ул. Достык, 10, кв. 5
              </span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-foreground/70 mb-1">
              Данные клиента (опционально)
            </div>
            <div className="h-9 rounded-lg border border-border bg-background px-3 flex items-center">
              <span className="text-xs text-muted-foreground/30">
                Имя, телефон, адрес...
              </span>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <div className="h-8 px-4 rounded-lg bg-foreground text-background text-xs font-semibold flex items-center">
              Создать
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Add room ── */
function MockStep2() {
  const rooms = [
    "Балкон",
    "Гостиная",
    "Детская",
    "Зал",
    "Кабинет",
    "Кухня",
    "Прихожая",
    "Санузел",
    "Спальня",
    "Холл",
  ];
  return (
    <div className="p-5 min-h-[360px] flex items-center justify-center">
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">
            Добавить комнату
          </h3>
          <X className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <div className="text-[11px] font-medium text-foreground/70 mb-1.5">
          Тип комнаты
        </div>
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          {rooms.map((room, i) => (
            <div
              key={room}
              className={`px-3 py-1.5 text-xs text-foreground/80 ${i === 0 ? "bg-muted/40 font-medium" : ""} ${i < rooms.length - 1 ? "border-b border-border/30" : ""}`}
            >
              {room}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Product components ── */
function MockStep3() {
  const components = [
    { name: "Секции", enabled: true },
    { name: "Фальш-фасад", enabled: false },
    { name: "Перегородки", enabled: true },
    { name: "Ящики", enabled: true },
    { name: "Полки", enabled: true },
    { name: "Столешница", enabled: false },
    { name: "Фасады", enabled: true },
    { name: "Дополнительно", enabled: false },
  ];
  return (
    <div className="p-5 min-h-[360px]">
      <div className="mb-4">
        <div className="text-sm font-bold text-foreground">
          Кухонный гарнитур
        </div>
        <div className="text-[10px] text-muted-foreground/50 mt-0.5">
          Настройте компоненты изделия
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {components.map(({ name, enabled }) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-2.5"
          >
            <span
              className={`text-[11px] font-medium ${enabled ? "text-foreground" : "text-muted-foreground/50"}`}
            >
              {name}
            </span>
            <div
              className={`w-7 h-4 rounded-full flex items-center transition-all ${enabled ? "bg-foreground justify-end" : "bg-muted justify-start"}`}
            >
              <div className="w-3 h-3 rounded-full bg-background mx-0.5 shadow-sm" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-9 rounded-lg bg-foreground text-background text-xs font-semibold flex items-center justify-center gap-1.5">
        Сохранить
      </div>
    </div>
  );
}

/* ── Step 4: Calculation ── */
function MockStep4() {
  return (
    <div className="p-5 min-h-[360px]">
      <div className="text-sm font-bold text-foreground mb-3">
        Расчёт: ЖК Вавилон
      </div>
      {/* Tier tabs */}
      <div className="grid grid-cols-3 rounded-lg border border-border overflow-hidden mb-4">
        <div className="text-center py-1.5 text-[10px] text-muted-foreground/50 bg-background">
          Стандарт
        </div>
        <div className="text-center py-1.5 text-[10px] font-semibold text-foreground bg-muted/40 border-x border-border">
          Комфорт
        </div>
        <div className="text-center py-1.5 text-[10px] text-muted-foreground/50 bg-background">
          Премиум
        </div>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border border-border p-2.5 text-center">
          <div className="text-[9px] text-muted-foreground/50 mb-0.5">
            Стоимость материалов
          </div>
          <div className="text-sm font-bold text-foreground">32 450 ₸</div>
        </div>
        <div className="rounded-lg border border-border p-2.5 text-center">
          <div className="text-[9px] text-muted-foreground/50 mb-0.5">
            Стоимость фурнитуры
          </div>
          <div className="text-sm font-bold text-foreground">18 200 ₸</div>
        </div>
      </div>
      {/* Service rows */}
      <div className="space-y-1.5">
        {[
          { name: "Распил", val: "2 200 ₸" },
          { name: "Присадка", val: "5 000 ₸" },
          { name: "Кромка", val: "7 500 ₸" },
          { name: "Доставка", val: "30 000 ₸" },
        ].map(({ name, val }) => (
          <div
            key={name}
            className="flex items-center justify-between text-[10px] px-1"
          >
            <span className="text-muted-foreground/60">{name}</span>
            <span className="text-foreground/70 font-medium">{val}</span>
          </div>
        ))}
      </div>
      {/* Total */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Итого</span>
        <span className="text-base font-bold text-foreground">121 350 ₸</span>
      </div>
    </div>
  );
}

/* ── Step 5: Commercial proposal ── */
function MockStep5() {
  return (
    <div className="p-5 min-h-[360px]">
      <div className="text-sm font-bold text-foreground mb-3">
        Коммерческое предложение
      </div>
      {/* Tier tabs */}
      <div className="grid grid-cols-3 rounded-lg border border-border overflow-hidden mb-4">
        <div className="text-center py-1.5 text-[10px] text-muted-foreground/50 bg-background">
          Стандарт
        </div>
        <div className="text-center py-1.5 text-[10px] font-semibold text-foreground bg-muted/40 border-x border-border">
          Комфорт
        </div>
        <div className="text-center py-1.5 text-[10px] text-muted-foreground/50 bg-background">
          Премиум
        </div>
      </div>
      {/* KP card */}
      <div className="rounded-xl border border-border p-4">
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1 text-[8px] font-semibold text-primary border border-primary/20 rounded-full px-2 py-0.5 mb-1.5">
            КОММЕРЦИЯЛЫҚ ҰСЫНЫС
          </div>
          <div className="text-sm font-bold text-foreground">ЖК Вавилон</div>
          <div className="text-[9px] text-muted-foreground/50 mt-0.5">
            Анар 87715454477 · 11.03.2026
          </div>
        </div>
        <div className="text-[10px] font-semibold text-foreground/70 mb-2 flex items-center gap-1">
          <Home className="h-3 w-3" /> ДЕТСКАЯ
        </div>
        <div className="rounded-lg border border-border/50 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-foreground/80">
              Кухонный гарнитур
            </span>
            <span className="text-[10px] font-bold text-foreground">
              483 298 ₸
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[8px] text-muted-foreground/50">
            <div>• ЛДСП (Секции, Перегородки)</div>
            <div>• Петли (Hettich)</div>
            <div>• МДФ (Фасады)</div>
            <div>• Полкодержатели (GTV)</div>
            <div>• Кромка (Egger)</div>
            <div>• Телескоп (Hettich)</div>
          </div>
        </div>
      </div>
      {/* Total */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Итого</span>
        <span className="text-base font-bold text-foreground">483 298 ₸</span>
      </div>
    </div>
  );
}

/* ── Step 6: CRM Kanban ── */
function MockStep6() {
  const columns = [
    {
      title: "Новые",
      color: "bg-blue-500",
      cards: [
        { name: "ЖК Алтын Орда", client: "Айбек", amount: "850 000 ₸" },
        { name: "Квартира Манас", client: "Нурлан", amount: "420 000 ₸" },
      ],
    },
    {
      title: "В работе",
      color: "bg-amber-500",
      cards: [
        { name: "Коттедж Бостандык", client: "Дамир", amount: "1 200 000 ₸" },
      ],
    },
    {
      title: "Оплата",
      color: "bg-emerald-500",
      cards: [{ name: "ЖК Вавилон", client: "Анар", amount: "483 298 ₸" }],
    },
    {
      title: "Готово",
      color: "bg-muted-foreground",
      cards: [
        { name: "Студия Сарыарка", client: "Асель", amount: "315 000 ₸" },
      ],
    },
  ];

  return (
    <div className="p-4 min-h-[360px]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <LayoutGrid className="h-4 w-4 text-primary" />
          CRM
        </div>
        <div className="text-[9px] text-muted-foreground/40">4 этапа</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {columns.map((col) => (
          <div key={col.title} className="space-y-1.5">
            {/* Column header */}
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-2 h-2 rounded-full ${col.color}`} />
              <span className="text-[9px] font-semibold text-foreground/70">
                {col.title}
              </span>
              <span className="text-[8px] text-muted-foreground/30 ml-auto">
                {col.cards.length}
              </span>
            </div>
            {/* Cards */}
            {col.cards.map((card) => (
              <div
                key={card.name}
                className="rounded-lg border border-border/40 bg-background p-2 space-y-1"
              >
                <div className="text-[8px] font-semibold text-foreground/80 leading-tight">
                  {card.name}
                </div>
                <div className="text-[7px] text-muted-foreground/40">
                  {card.client}
                </div>
                <div className="text-[8px] font-bold text-foreground/60">
                  {card.amount}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const STEP_MOCKS = [
  MockStep1,
  MockStep2,
  MockStep3,
  MockStep4,
  MockStep5,
  MockStep6,
];

export function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = t.raw("steps") as { title: string; description: string }[];

  const onStepChange = useCallback((idx: number) => {
    setActiveStep(idx);
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    // Only pin on large screens
    if (window.innerWidth < 1024) return;

    const container = sectionRef.current;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: `+=${steps.length * 30}%`,
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const idx = Math.min(
            Math.floor(self.progress * steps.length),
            steps.length - 1,
          );
          onStepChange(idx);
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [steps.length, onStepChange]);

  const ActiveMock = STEP_MOCKS[activeStep];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="lg:min-h-screen flex items-center bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">{t("title")}</h2>
          <div className="mt-3 mx-auto h-1 w-12 rounded-full bg-primary/40" />
        </div>

        {/* ── Mobile: vertical timeline ── */}
        <div className="lg:hidden relative">
          {/* Progress line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />

          <div className="space-y-6">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.08,
                    ease: "easeOut",
                  }}
                  className="relative flex gap-4 pl-1"
                >
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-semibold text-foreground text-sm">
                      <span className="text-primary/60 mr-1.5 text-xs font-bold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Desktop: pinned interactive ── */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Steps list */}
          <div className="space-y-3">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              const isActive = i === activeStep;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-400 ${
                    isActive
                      ? "bg-primary/5 border border-primary/20 shadow-md"
                      : "opacity-40 hover:opacity-60"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all duration-300 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      <span className="text-primary/70 mr-1.5 text-xs font-bold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {step.title}
                    </h3>
                    {isActive && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mock UI panel */}
          <div>
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-muted/60 to-muted/40 border-b border-border/30">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 mx-6 h-5 rounded-md bg-background/60 border border-border/20 flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground/35 select-none font-medium">
                    onaymebel.kz
                  </span>
                </div>
              </div>
              {/* Step-specific content */}
              <ActiveMock />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
