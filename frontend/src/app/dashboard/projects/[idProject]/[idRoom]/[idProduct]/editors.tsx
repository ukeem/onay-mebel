"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { selectOnFocus } from "@/lib/utils";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { memo } from "react";

import type { ExtraItem, MatOption, SubItem, TFunc } from "./types";
import { clamp, dec, num } from "./types";

/* ── Section wrapper with icon + toggle ── */
export const ToggleSection = memo(function ToggleSection({
  icon: Icon,
  label,
  checked,
  onChange,
  disabled,
  children,
}: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0 overflow-hidden transition-all">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-accent/50 active:bg-accent/70 cursor-pointer"
        }`}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        aria-disabled={disabled}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            checked
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      </div>
      {checked && children && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
          {children}
        </div>
      )}
    </Card>
  );
});

/* ── sub-switch row (for nested toggles) ── */
export const SwitchRow = memo(function SwitchRow({
  label,
  checked,
  onChange,
  disabled,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-accent/30 cursor-pointer"
        }`}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        aria-disabled={disabled}
      >
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
        <span className="flex-1 text-sm font-medium">{label}</span>
        {checked && (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
        )}
      </div>
      {checked && children && <div className="pl-2">{children}</div>}
    </div>
  );
});

/* ── qty select ── */
export const QtySelect = memo(function QtySelect({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label?: string;
}) {
  const safeMax = Math.max(min, Math.floor(max));
  const opts: number[] = [];
  for (let n = min; n <= safeMax; n++) opts.push(n);
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-xs text-muted-foreground">{label}</Label>
      )}
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opts.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

/* ── material select ── */
export const MatSelect = memo(function MatSelect({
  value,
  onChange,
  label,
  materials,
  t,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  materials: MatOption[];
  t: TFunc;
  error?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={`h-9 w-full ${error ? "ring-2 ring-destructive/50 border-destructive" : ""}`}
        >
          <SelectValue placeholder={t("common.select")} />
        </SelectTrigger>
        <SelectContent>
          {materials.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.materialType.name} {m.brand ? `(${m.brand})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

/* ── dimension editor ── */
export const DimensionEditor = memo(function DimensionEditor({
  items,
  setItems,
  dimLabel,
  dimKey,
  maxQty,
  dimMin,
  dimMax,
  defaultDim,
  t,
}: {
  items: SubItem[];
  setItems: (v: SubItem[]) => void;
  dimLabel: string;
  dimKey: "width" | "height";
  maxQty: number;
  dimMin: number;
  dimMax: number;
  defaultDim?: number;
  t: TFunc;
}) {
  const usedTotal = items.reduce((s, x) => s + x.qty, 0);
  return (
    <div className="space-y-2">
      {items.map((s, i) => {
        const othersSum = usedTotal - s.qty;
        const maxForThis = Math.max(1, maxQty - othersSum);
        return (
          <div
            key={i}
            className="relative rounded-lg border bg-background p-3 pr-10"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("common.deleteItem")}
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {dimLabel} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  min={dimMin}
                  max={dimMax}
                  value={s[dimKey] ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...s, [dimKey]: num(e.target.value) };
                    setItems(copy);
                  }}
                  onBlur={() => {
                    const v = clamp(s[dimKey] ?? dimMin, dimMin, dimMax);
                    if (v !== (s[dimKey] ?? 0)) {
                      const copy = [...items];
                      copy[i] = { ...s, [dimKey]: v };
                      setItems(copy);
                    }
                  }}
                />
              </div>
              <QtySelect
                label={t("product.qty")}
                value={s.qty}
                onChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...s, qty: v };
                  setItems(copy);
                }}
                min={1}
                max={maxForThis}
              />
            </div>
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={usedTotal >= maxQty}
        onClick={() =>
          setItems([...items, { qty: 1, [dimKey]: defaultDim ?? dimMin }])
        }
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t("common.add")}
      </Button>
    </div>
  );
});

/* ── facades editor ── */
export const FacadesEditor = memo(function FacadesEditor({
  items,
  setItems,
  materials,
  maxQty,
  maxW,
  maxH,
  defaultW,
  defaultH,
  t,
  errorKeys,
}: {
  items: SubItem[];
  setItems: (v: SubItem[]) => void;
  materials: MatOption[];
  maxQty: number;
  maxW: number;
  maxH: number;
  defaultW?: number;
  defaultH?: number;
  t: TFunc;
  errorKeys?: Set<string>;
}) {
  const usedTotal = items.reduce((s, x) => s + x.qty, 0);
  return (
    <div className="space-y-2">
      {items.map((f, i) => {
        const othersSum = usedTotal - f.qty;
        const maxForThis = Math.max(1, maxQty - othersSum);
        const maxWidthForFacade = Math.floor(maxW / Math.max(1, f.qty));
        return (
          <div
            key={i}
            className="relative rounded-lg border bg-background p-3 pr-10 space-y-2.5"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("common.deleteItem")}
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.width")}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  min={300}
                  max={maxWidthForFacade}
                  value={f.width ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...f, width: num(e.target.value) };
                    setItems(copy);
                  }}
                  onBlur={() => {
                    const v = clamp(f.width ?? 300, 300, maxWidthForFacade);
                    if (v !== (f.width ?? 0)) {
                      const copy = [...items];
                      copy[i] = { ...f, width: v };
                      setItems(copy);
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.height")}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  min={300}
                  max={maxH}
                  value={f.height ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...f, height: num(e.target.value) };
                    setItems(copy);
                  }}
                  onBlur={() => {
                    const v = clamp(f.height ?? 300, 300, maxH);
                    if (v !== (f.height ?? 0)) {
                      const copy = [...items];
                      copy[i] = { ...f, height: v };
                      setItems(copy);
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.handles")}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  min={0}
                  value={f.handleQty ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...f, handleQty: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <QtySelect
                label={t("product.qty")}
                value={f.qty}
                onChange={(v) => {
                  const newMaxW = Math.floor(maxW / Math.max(1, v));
                  const copy = [...items];
                  copy[i] = {
                    ...f,
                    qty: v,
                    width: Math.max(300, newMaxW),
                  };
                  setItems(copy);
                }}
                min={1}
                max={maxForThis}
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
              <Switch
                checked={f.isLdsp ?? false}
                onCheckedChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...f, isLdsp: v };
                  setItems(copy);
                }}
              />
              <Label className="text-sm">{t("product.ldspBody")}</Label>
            </div>
            <div className={f.isLdsp ? "pointer-events-none opacity-40" : ""}>
              <MatSelect
                label={t("product.material")}
                value={f.materialId || ""}
                onChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...f, materialId: v };
                  setItems(copy);
                }}
                materials={materials}
                t={t}
                error={!f.isLdsp && errorKeys?.has(`_${i}`)}
              />
            </div>
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={usedTotal >= maxQty}
        onClick={() =>
          setItems([
            ...items,
            {
              qty: 1,
              width: defaultW ?? 300,
              height: defaultH ?? 300,
              materialId: "",
              handleQty: 0,
            },
          ])
        }
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t("common.add")}
      </Button>
    </div>
  );
});

/* ── drawers editor ── */
export const DrawersEditor = memo(function DrawersEditor({
  items,
  setItems,
  prodH,
  prodW,
  totalSections,
  totalPartitions,
  t,
}: {
  items: SubItem[];
  setItems: (v: SubItem[]) => void;
  prodH: number;
  prodW: number;
  totalSections: number;
  totalPartitions: number;
  t: TFunc;
}) {
  const maxDrawerW =
    totalSections + totalPartitions > 0
      ? Math.floor(prodW / (totalSections + totalPartitions))
      : prodW;
  const multiplier = Math.max(1, totalSections + totalPartitions);
  const effectiveH = prodH * multiplier;
  const usedHeightTotal = items.reduce(
    (s, x) => s + (x.height ?? 150) * x.qty,
    0,
  );
  return (
    <div className="space-y-2">
      {items.map((d, i) => {
        const drawerH = Math.max(d.height ?? 150, 150);
        const othersUsedH = usedHeightTotal - (d.height ?? 150) * d.qty;
        const remainingH = Math.max(0, effectiveH - othersUsedH);
        const maxQtyForThis =
          drawerH > 0 ? Math.max(1, Math.floor(remainingH / drawerH)) : 1;
        return (
          <div
            key={i}
            className="relative rounded-lg border bg-background p-3 pr-10"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("common.deleteItem")}
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.width")}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  min={150}
                  max={maxDrawerW}
                  value={d.width ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...d, width: num(e.target.value) };
                    setItems(copy);
                  }}
                  onBlur={() => {
                    const v = clamp(d.width ?? 150, 150, maxDrawerW);
                    if (v !== (d.width ?? 0)) {
                      const copy = [...items];
                      copy[i] = { ...d, width: v };
                      setItems(copy);
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.height")}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  min={150}
                  max={300}
                  value={d.height ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...d, height: num(e.target.value) };
                    setItems(copy);
                  }}
                  onBlur={() => {
                    const v = clamp(d.height ?? 150, 150, 300);
                    if (v !== (d.height ?? 0)) {
                      const copy = [...items];
                      copy[i] = { ...d, height: v };
                      setItems(copy);
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.handles")}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  min={0}
                  value={d.handleQty ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...d, handleQty: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <QtySelect
                label={t("product.qty")}
                value={d.qty}
                onChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...d, qty: v };
                  setItems(copy);
                }}
                min={1}
                max={maxQtyForThis}
              />
            </div>
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={usedHeightTotal >= effectiveH}
        onClick={() =>
          setItems([
            ...items,
            { qty: 1, width: maxDrawerW || 150, height: 150, handleQty: 0 },
          ])
        }
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t("common.add")}
      </Button>
    </div>
  );
});

/* ── extras editor ── */
export const ExtrasEditor = memo(function ExtrasEditor({
  items,
  setItems,
  t,
}: {
  items: ExtraItem[];
  setItems: (v: ExtraItem[]) => void;
  t: TFunc;
}) {
  return (
    <div className="space-y-2">
      {items.map((e, i) => (
        <div
          key={i}
          className="relative rounded-lg border bg-background p-3 pr-10"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
            aria-label={t("common.deleteItem")}
            onClick={() => setItems(items.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("common.name")}
              </Label>
              <Input
                className="h-9"
                value={e.name}
                onChange={(ev) => {
                  const copy = [...items];
                  copy[i] = { ...e, name: ev.target.value };
                  setItems(copy);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("common.price")} ₸
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                className="h-9"
                value={e.price}
                onFocus={selectOnFocus}
                onChange={(ev) => {
                  const copy = [...items];
                  copy[i] = { ...e, price: dec(ev.target.value) };
                  setItems(copy);
                }}
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setItems([...items, { name: "", price: 0 }])}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t("common.add")}
      </Button>
    </div>
  );
});
