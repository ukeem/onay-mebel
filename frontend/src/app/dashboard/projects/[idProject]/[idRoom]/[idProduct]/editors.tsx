"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { selectOnFocus } from "@/lib/utils";
import type {
  CountertopData,
  ExtraItem,
  ExtraType,
  FalseFacadeItem,
} from "@/types";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { memo, useState } from "react";

import type { HwOption, MatOption, SubItem, TFunc } from "./types";
import { dec, num } from "./types";
import type { CollapseState } from "./use-collapse-state";

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
    <Card className="gap-0 py-0 overflow-hidden transition-all break-inside-avoid">
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

/* ── sub-switch row ── */
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

/* ── Collapsible item wrapper ── */
export const CollapsibleItem = memo(function CollapsibleItem({
  index,
  label,
  onLabelChange,
  onDelete,
  defaultLabel,
  collapsed,
  onToggle,
  t,
  children,
}: {
  index: number;
  label?: string;
  onLabelChange: (v: string) => void;
  onDelete: () => void;
  defaultLabel: string;
  collapsed: boolean;
  onToggle: () => void;
  t: TFunc;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  const displayLabel = label || `${defaultLabel} ${index + 1}`;

  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      {/* header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}

        {editing ? (
          <Input
            autoFocus
            className="h-7 text-sm flex-1"
            value={label || ""}
            placeholder={displayLabel}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium truncate"
            title={displayLabel}
          >
            {displayLabel}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t("product.editLabel")}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
          aria-label={t("common.deleteItem")}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* body */}
      {!collapsed && (
        <div className="border-t px-3 pb-3 pt-2.5 space-y-2.5">{children}</div>
      )}
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
  const options = materials.map((m) => ({
    value: m.id,
    label: `${m.materialType.name}${m.brand ? ` (${m.brand})` : ""}`,
  }));
  return (
    <div className="space-y-1.5">
      <Label
        className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {label}
      </Label>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={t("common.select")}
        searchPlaceholder={t("common.search") + "…"}
        emptyText={t("common.noResults")}
        error={error}
      />
    </div>
  );
});

/* ── hardware select ── */
export const HwSelect = memo(function HwSelect({
  value,
  onChange,
  label,
  items,
  t,
  error,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  items: HwOption[];
  t: TFunc;
  error?: boolean;
  disabled?: boolean;
}) {
  const options = items.map((h) => ({
    value: h.id,
    label: `${h.hardwareType.name}${h.brand ? ` (${h.brand})` : ""}`,
  }));
  return (
    <div className="space-y-1.5">
      <Label
        className={`text-xs ${error ? "text-destructive" : disabled ? "text-muted-foreground/50" : "text-muted-foreground"}`}
      >
        {label}
      </Label>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={t("common.select")}
        searchPlaceholder={t("common.search") + "…"}
        emptyText={t("common.noResults")}
        disabled={disabled}
        error={error}
      />
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

/* ════════════════════════════════════════════════════
   SECTIONS EDITOR
   Each section: qty, width, height, depth, materialId,
   backWallEnabled, backWallMaterialId
   ════════════════════════════════════════════════════ */
export const SectionsEditor = memo(function SectionsEditor({
  items,
  setItems,
  materials,
  backWallMaterials,
  legsHardware,
  t,
  defaultItem,
  errors,
  cs,
}: {
  items: SubItem[];
  setItems: (v: SubItem[]) => void;
  materials: MatOption[];
  backWallMaterials: MatOption[];
  legsHardware: HwOption[];
  t: TFunc;
  defaultItem: {
    width: number;
    height: number;
    depth: number;
    materialId: string;
  };
  errors?: Set<string>;
  cs: CollapseState;
}) {
  return (
    <div className="space-y-2">
      {items.map((s, i) => {
        const ck = `sec_${s.id || i}`;
        return (
          <CollapsibleItem
            key={s.id || i}
            index={i}
            label={s.label}
            onLabelChange={(v) => {
              const copy = [...items];
              copy[i] = { ...s, label: v };
              setItems(copy);
            }}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
            defaultLabel={t("product.sectionGroup")}
            collapsed={cs.isCollapsed(ck, !!s.id)}
            onToggle={() => cs.toggle(ck)}
            t={t}
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.width")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={s.width ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...s, width: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.height")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={s.height ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...s, height: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.depth")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={s.depth ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...s, depth: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
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
              max={20}
            />
            <MatSelect
              label={t("product.material")}
              value={s.materialId || ""}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = { ...s, materialId: v };
                setItems(copy);
              }}
              materials={materials}
              t={t}
              error={errors?.has(`sectionMaterial_${i}`)}
            />
            <SwitchRow
              label={t("product.backWall")}
              checked={s.backWallEnabled ?? false}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = {
                  ...s,
                  backWallEnabled: v,
                  backWallMaterialId: v
                    ? s.backWallMaterialId ||
                      defaultItem.materialId ||
                      undefined
                    : undefined,
                };
                setItems(copy);
              }}
            >
              <MatSelect
                label={t("product.backWallMaterial")}
                value={s.backWallMaterialId || ""}
                onChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...s, backWallMaterialId: v };
                  setItems(copy);
                }}
                materials={backWallMaterials}
                t={t}
                error={errors?.has(`backWallMaterial_${i}`)}
              />
            </SwitchRow>
            <SwitchRow
              label={t("product.legs")}
              checked={s.legsEnabled ?? false}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = {
                  ...s,
                  legsEnabled: v,
                  legsHardwareId: v ? s.legsHardwareId : undefined,
                };
                setItems(copy);
              }}
            >
              {legsHardware.length > 0 && (
                <HwSelect
                  label={t("product.legsBrand")}
                  value={s.legsHardwareId || ""}
                  onChange={(v) => {
                    const copy = [...items];
                    copy[i] = { ...s, legsHardwareId: v };
                    setItems(copy);
                  }}
                  items={legsHardware}
                  t={t}
                  error={errors?.has(`legsHardware_${i}`)}
                />
              )}
            </SwitchRow>
          </CollapsibleItem>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() =>
          setItems([
            ...items,
            {
              qty: 1,
              width: defaultItem.width,
              height: defaultItem.height,
              depth: defaultItem.depth,
              materialId: defaultItem.materialId,
              backWallMaterialId: defaultItem.materialId || undefined,
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

/* ════════════════════════════════════════════════════
   GENERIC COMPONENT EDITOR
   For Partitions (height+depth+material+qty)
   and Shelves (width+depth+material+qty)
   ════════════════════════════════════════════════════ */
export const ComponentEditor = memo(function ComponentEditor({
  items,
  setItems,
  dim1Key,
  dim1Label,
  dim2Key,
  dim2Label,
  materials,
  t,
  hardwareLabel,
  hardwareItems,
  hardwareField,
  defaultItem,
  errors,
  defaultLabel,
  cs,
  collapsePrefix,
}: {
  items: SubItem[];
  setItems: (v: SubItem[]) => void;
  dim1Key: "width" | "height";
  dim1Label: string;
  dim2Key: "depth";
  dim2Label: string;
  materials: MatOption[];
  t: TFunc;
  hardwareLabel?: string;
  hardwareItems?: HwOption[];
  hardwareField?: "holderHardwareId";
  defaultItem?: { dim1: number; dim2: number; materialId: string };
  errors?: Set<string>;
  defaultLabel?: string;
  cs?: CollapseState;
  collapsePrefix?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((s, i) => {
        const ck = `${collapsePrefix || "comp"}_${s.id || i}`;
        return (
          <CollapsibleItem
            key={s.id || i}
            index={i}
            label={s.label}
            onLabelChange={(v) => {
              const copy = [...items];
              copy[i] = { ...s, label: v };
              setItems(copy);
            }}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
            defaultLabel={defaultLabel || t("product.position")}
            collapsed={cs ? cs.isCollapsed(ck, !!s.id) : false}
            onToggle={() => cs?.toggle(ck)}
            t={t}
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {dim1Label} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={s[dim1Key] ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...s, [dim1Key]: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {dim2Label} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={s[dim2Key] ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...s, [dim2Key]: num(e.target.value) };
                    setItems(copy);
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
                max={20}
              />
            </div>
            <MatSelect
              label={t("product.material")}
              value={s.materialId || ""}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = { ...s, materialId: v };
                setItems(copy);
              }}
              materials={materials}
              t={t}
              error={errors?.has(`mat_${i}`)}
            />
            {hardwareField && hardwareItems && hardwareItems.length > 0 && (
              <HwSelect
                label={hardwareLabel || ""}
                value={(s[hardwareField] as string) || ""}
                onChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...s, [hardwareField]: v };
                  setItems(copy);
                }}
                items={hardwareItems}
                t={t}
                error={errors?.has(`hw_${i}`)}
              />
            )}
          </CollapsibleItem>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() =>
          setItems([
            ...items,
            {
              qty: 1,
              [dim1Key]: defaultItem?.dim1 ?? 600,
              [dim2Key]: defaultItem?.dim2 ?? 600,
              materialId: defaultItem?.materialId || undefined,
            } as SubItem,
          ])
        }
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t("common.add")}
      </Button>
    </div>
  );
});

/* ════════════════════════════════════════════════════
   FALSE FACADES EDITOR
   Each: qty, height, depth, materialId
   ════════════════════════════════════════════════════ */
export const FalseFacadesEditor = memo(function FalseFacadesEditor({
  items,
  setItems,
  materials,
  t,
  defaultItem,
  errors,
  cs,
}: {
  items: FalseFacadeItem[];
  setItems: (v: FalseFacadeItem[]) => void;
  materials: MatOption[];
  t: TFunc;
  defaultItem?: { height: number; depth: number; materialId: string };
  errors?: Set<string>;
  cs?: CollapseState;
}) {
  return (
    <div className="space-y-2">
      {items.map((ff, i) => {
        const ck = `ff_${ff.id || i}`;
        return (
          <CollapsibleItem
            key={ff.id || i}
            index={i}
            label={ff.label}
            onLabelChange={(v) => {
              const copy = [...items];
              copy[i] = { ...ff, label: v };
              setItems(copy);
            }}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
            defaultLabel={t("product.falseFacade")}
            collapsed={cs ? cs.isCollapsed(ck, !!ff.id) : false}
            onToggle={() => cs?.toggle(ck)}
            t={t}
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.height")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={ff.height}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...ff, height: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.depth")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={ff.depth}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...ff, depth: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <QtySelect
                label={t("product.qty")}
                value={ff.qty}
                onChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...ff, qty: v };
                  setItems(copy);
                }}
                min={1}
                max={20}
              />
            </div>
            <MatSelect
              label={t("product.material")}
              value={ff.materialId || ""}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = { ...ff, materialId: v };
                setItems(copy);
              }}
              materials={materials}
              t={t}
              error={errors?.has(`mat_${i}`)}
            />
          </CollapsibleItem>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() =>
          setItems([
            ...items,
            {
              qty: 1,
              height: defaultItem?.height ?? 2000,
              depth: defaultItem?.depth ?? 600,
              materialId: defaultItem?.materialId || undefined,
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

/* ════════════════════════════════════════════════════
   FACADES EDITOR
   Order: габариты → кол-во → материал → петли → тип открывания → (ручки|tip-on)
   ════════════════════════════════════════════════════ */
export const FacadesEditor = memo(function FacadesEditor({
  items,
  setItems,
  materials,
  t,
  errorKeys,
  hingeHardware,
  handleHardware,
  tipOnHardware,
  defaultWidth,
  defaultHeight,
  cs,
}: {
  items: SubItem[];
  setItems: (v: SubItem[]) => void;
  materials: MatOption[];
  t: TFunc;
  errorKeys?: Set<string>;
  hingeHardware?: HwOption[];
  handleHardware?: HwOption[];
  tipOnHardware?: HwOption[];
  defaultWidth?: number;
  defaultHeight?: number;
  cs?: CollapseState;
}) {
  return (
    <div className="space-y-2">
      {items.map((f, i) => {
        const ck = `fac_${f.id || i}`;
        return (
          <CollapsibleItem
            key={f.id || i}
            index={i}
            label={f.label}
            onLabelChange={(v) => {
              const copy = [...items];
              copy[i] = { ...f, label: v };
              setItems(copy);
            }}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
            defaultLabel={t("product.facade")}
            collapsed={cs ? cs.isCollapsed(ck, !!f.id) : false}
            onToggle={() => cs?.toggle(ck)}
            t={t}
          >
            {/* Row 1: габариты */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.width")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={f.width ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...f, width: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.height")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={f.height ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...f, height: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
            </div>
            {/* Row 2: кол-во 100% */}
            <QtySelect
              label={t("product.qty")}
              value={f.qty}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = { ...f, qty: v };
                setItems(copy);
              }}
              min={1}
              max={20}
            />
            {/* Row 3: материал */}
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
              error={errorKeys?.has(`mat_${i}`)}
            />
            {/* Row 4: петли */}
            {hingeHardware && hingeHardware.length > 0 && (
              <HwSelect
                label={t("product.hinges")}
                value={f.hingeHardwareId || ""}
                onChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...f, hingeHardwareId: v };
                  setItems(copy);
                }}
                items={hingeHardware}
                t={t}
                error={errorKeys?.has(`hinge_${i}`)}
              />
            )}
            {/* Row 5: тип открывания */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("product.facadeOpenType")}
              </Label>
              <div className="inline-flex w-full rounded-md border bg-primary/10 p-0.5">
                {(["HANDLE", "TIP_ON"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`flex-1 rounded-[5px] px-3 py-1.5 text-xs font-medium transition-colors ${
                      (f.openType ?? "HANDLE") === opt
                        ? "bg-background text-foreground shadow-sm"
                        : "text-foreground"
                    }`}
                    onClick={() => {
                      const copy = [...items];
                      copy[i] = {
                        ...f,
                        openType: opt,
                        handleQty: opt === "TIP_ON" ? 0 : f.handleQty,
                        handleHardwareId:
                          opt === "TIP_ON" ? undefined : f.handleHardwareId,
                        tipOnHardwareId:
                          opt === "HANDLE" ? undefined : f.tipOnHardwareId,
                      };
                      setItems(copy);
                    }}
                  >
                    {opt === "HANDLE" ? t("product.handleOpenType") : "Tip-On"}
                  </button>
                ))}
              </div>
            </div>
            {/* Row 6: зависимые поля */}
            {(f.openType ?? "HANDLE") === "HANDLE" ? (
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("product.handles")}
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="h-9"
                    value={f.handleQty ?? 0}
                    onFocus={selectOnFocus}
                    onChange={(e) => {
                      const val = num(e.target.value);
                      const copy = [...items];
                      copy[i] = {
                        ...f,
                        handleQty: val,
                        handleHardwareId:
                          val === 0 ? undefined : f.handleHardwareId,
                      };
                      setItems(copy);
                    }}
                  />
                </div>
                {handleHardware && handleHardware.length > 0 && (
                  <HwSelect
                    label={t("product.handleBrand")}
                    value={f.handleHardwareId || ""}
                    onChange={(v) => {
                      const copy = [...items];
                      copy[i] = { ...f, handleHardwareId: v };
                      setItems(copy);
                    }}
                    items={handleHardware}
                    t={t}
                    error={errorKeys?.has(`handle_${i}`)}
                    disabled={(f.handleQty ?? 0) === 0}
                  />
                )}
              </div>
            ) : (
              tipOnHardware &&
              tipOnHardware.length > 0 && (
                <HwSelect
                  label={t("product.tipOnBrand")}
                  value={f.tipOnHardwareId || ""}
                  onChange={(v) => {
                    const copy = [...items];
                    copy[i] = { ...f, tipOnHardwareId: v };
                    setItems(copy);
                  }}
                  items={tipOnHardware}
                  t={t}
                  error={errorKeys?.has(`tipOn_${i}`)}
                />
              )
            )}
          </CollapsibleItem>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() =>
          setItems([
            ...items,
            {
              qty: 1,
              width: defaultWidth ?? 600,
              height: defaultHeight ?? 600,
              materialId: "",
              handleQty: 0,
              openType: "HANDLE" as const,
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

/* ════════════════════════════════════════════════════
   DRAWERS EDITOR
   Each: qty, width, height, depth, materialId, handleQty, slideType
   ════════════════════════════════════════════════════ */
export const DrawersEditor = memo(function DrawersEditor({
  items,
  setItems,
  materials,
  t,
  slideHardware,
  tandemHardware,
  defaultMaterialId,
  errors,
  cs,
}: {
  items: SubItem[];
  setItems: (v: SubItem[]) => void;
  materials: MatOption[];
  t: TFunc;
  slideHardware?: HwOption[];
  tandemHardware?: HwOption[];
  defaultMaterialId?: string;
  errors?: Set<string>;
  cs?: CollapseState;
}) {
  return (
    <div className="space-y-2">
      {items.map((d, i) => {
        const ck = `drw_${d.id || i}`;
        return (
          <CollapsibleItem
            key={d.id || i}
            index={i}
            label={d.label}
            onLabelChange={(v) => {
              const copy = [...items];
              copy[i] = { ...d, label: v };
              setItems(copy);
            }}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
            defaultLabel={t("product.drawer")}
            collapsed={cs ? cs.isCollapsed(ck, !!d.id) : false}
            onToggle={() => cs?.toggle(ck)}
            t={t}
          >
            {/* Row 1: габариты */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.width")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={d.width ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...d, width: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.height")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={d.height ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...d, height: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.depth")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={d.depth ?? 0}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...d, depth: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
            </div>
            {/* Row 2: кол-во ручек + кол-во ящиков 50/50 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.handles")}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
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
                label={t("product.drawerQty")}
                value={d.qty}
                onChange={(v) => {
                  const copy = [...items];
                  copy[i] = { ...d, qty: v };
                  setItems(copy);
                }}
                min={1}
                max={20}
              />
            </div>
            {/* Row 3: материал */}
            <MatSelect
              label={t("product.material")}
              value={d.materialId || ""}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = { ...d, materialId: v };
                setItems(copy);
              }}
              materials={materials}
              t={t}
              error={errors?.has(`mat_${i}`)}
            />
            {/* Row 4: тип направляющих */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("product.slideType")}
              </Label>
              <div className="inline-flex w-full rounded-md border bg-primary/10 p-0.5">
                {(["GUIDE", "TANDEM"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`flex-1 rounded-[5px] px-3 py-1.5 text-xs font-medium transition-colors ${
                      (d.slideType ?? "GUIDE") === opt
                        ? "bg-background text-foreground shadow-sm"
                        : "text-foreground"
                    }`}
                    onClick={() => {
                      const copy = [...items];
                      copy[i] = {
                        ...d,
                        slideType: opt,
                        slideHardwareId: undefined,
                      };
                      setItems(copy);
                    }}
                  >
                    {opt === "GUIDE"
                      ? t("product.drawerSlideGuide")
                      : t("product.drawerSlideTandem")}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const hwList =
                (d.slideType ?? "GUIDE") === "TANDEM"
                  ? tandemHardware
                  : slideHardware;
              return hwList && hwList.length > 0 ? (
                <HwSelect
                  label={
                    (d.slideType ?? "GUIDE") === "TANDEM"
                      ? t("product.tandemHardware")
                      : t("product.slideHardware")
                  }
                  value={d.slideHardwareId || ""}
                  onChange={(v) => {
                    const copy = [...items];
                    copy[i] = { ...d, slideHardwareId: v };
                    setItems(copy);
                  }}
                  items={hwList}
                  t={t}
                  error={errors?.has(`hw_${i}`)}
                />
              ) : null;
            })()}
          </CollapsibleItem>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() =>
          setItems([
            ...items,
            {
              qty: 1,
              width: 500,
              height: 150,
              depth: 400,
              materialId: defaultMaterialId || undefined,
              handleQty: 0,
              slideType: "GUIDE" as const,
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

/* ════════════════════════════════════════════════════
   COUNTERTOPS EDITOR
   Each: materialId, width, depth, apronEnabled,
   apronMaterialId, apronWidth, apronHeight
   ════════════════════════════════════════════════════ */
export const CountertopsEditor = memo(function CountertopsEditor({
  items,
  setItems,
  materials,
  t,
  hasError,
  defaultWidth,
  defaultDepth,
  cs,
}: {
  items: CountertopData[];
  setItems: (v: CountertopData[]) => void;
  materials: MatOption[];
  t: TFunc;
  hasError: (key: string) => boolean;
  defaultWidth?: number;
  defaultDepth?: number;
  cs?: CollapseState;
}) {
  return (
    <div className="space-y-2">
      {items.map((ct, i) => {
        const ck = `ct_${ct.id || i}`;
        return (
          <CollapsibleItem
            key={ct.id || i}
            index={i}
            label={ct.label}
            onLabelChange={(v) => {
              const copy = [...items];
              copy[i] = { ...ct, label: v };
              setItems(copy);
            }}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
            defaultLabel={t("product.countertop")}
            collapsed={cs ? cs.isCollapsed(ck, !!ct.id) : false}
            onToggle={() => cs?.toggle(ck)}
            t={t}
          >
            <MatSelect
              label={t("product.material")}
              value={ct.materialId || ""}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = { ...ct, materialId: v };
                setItems(copy);
              }}
              materials={materials}
              t={t}
              error={hasError(`countertopMaterial_${i}`)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.width")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={ct.width}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...ct, width: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("product.depth")} ({t("common.mm")})
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="h-9"
                  value={ct.depth}
                  onFocus={selectOnFocus}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[i] = { ...ct, depth: num(e.target.value) };
                    setItems(copy);
                  }}
                />
              </div>
            </div>
            <Separator />
            <SwitchRow
              label={t("product.apron")}
              checked={ct.apronEnabled}
              onChange={(v) => {
                const copy = [...items];
                copy[i] = { ...ct, apronEnabled: v };
                setItems(copy);
              }}
            >
              <div className="space-y-2">
                <MatSelect
                  label={t("product.apronMaterial")}
                  value={ct.apronMaterialId || ""}
                  onChange={(v) => {
                    const copy = [...items];
                    copy[i] = { ...ct, apronMaterialId: v };
                    setItems(copy);
                  }}
                  materials={materials}
                  t={t}
                  error={hasError(`apronMaterial_${i}`)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("product.width")} ({t("common.mm")})
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-9"
                      value={ct.apronWidth ?? 0}
                      onFocus={selectOnFocus}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[i] = { ...ct, apronWidth: num(e.target.value) };
                        setItems(copy);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t("product.height")} ({t("common.mm")})
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-9"
                      value={ct.apronHeight ?? 0}
                      onFocus={selectOnFocus}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[i] = { ...ct, apronHeight: num(e.target.value) };
                        setItems(copy);
                      }}
                    />
                  </div>
                </div>
              </div>
            </SwitchRow>
          </CollapsibleItem>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() =>
          setItems([
            ...items,
            {
              width: defaultWidth ?? 600,
              depth: defaultDepth ?? 600,
              apronEnabled: false,
              apronMaterialId: null,
              apronWidth: null,
              apronHeight: null,
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

/* ── extras editor ── */
export const ExtrasEditor = memo(function ExtrasEditor({
  items,
  setItems,
  extraTypes,
  t,
  cs,
}: {
  items: ExtraItem[];
  setItems: (v: ExtraItem[]) => void;
  extraTypes: ExtraType[];
  t: TFunc;
  cs?: CollapseState;
}) {
  const datalistId = "extra-type-suggestions";
  return (
    <div className="space-y-2">
      <datalist id={datalistId}>
        {extraTypes.map((et) => (
          <option key={et.id} value={et.name} />
        ))}
      </datalist>
      {items.map((e, i) => {
        const ck = `ext_${e.id || i}`;
        return (
          <CollapsibleItem
            key={e.id || i}
            index={i}
            label={e.label}
            onLabelChange={(v) => {
              const copy = [...items];
              copy[i] = { ...e, label: v };
              setItems(copy);
            }}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
            defaultLabel={t("product.extra")}
            collapsed={cs ? cs.isCollapsed(ck, !!e.id) : false}
            onToggle={() => cs?.toggle(ck)}
            t={t}
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("common.name")}
                </Label>
                <Input
                  className="h-9"
                  list={datalistId}
                  value={e.name}
                  placeholder={t("product.extraNameHint")}
                  onChange={(ev) => {
                    const val = ev.target.value;
                    const copy = [...items];
                    const match = extraTypes.find((et) => et.name === val);
                    copy[i] = {
                      ...e,
                      name: val,
                      ...(match && match.price ? { price: match.price } : {}),
                    };
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
          </CollapsibleItem>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() => setItems([...items, { name: "", price: 0 }])}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t("common.add")}
      </Button>
    </div>
  );
});
