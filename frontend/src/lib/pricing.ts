const parse = (env: string | undefined, fallback: number) => {
  if (!env) return fallback;
  const n = Number(env);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const fmt = (v: number) =>
  `${v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;

export const PRICE_MONTHLY = parse(
  process.env.NEXT_PUBLIC_PRICE_MONTHLY,
  25000,
);
export const PRICE_YEARLY = parse(process.env.NEXT_PUBLIC_PRICE_YEARLY, 240000);
export const YEARLY_SAVING = PRICE_YEARLY;

export const PRICE_MONTHLY_FMT = fmt(PRICE_MONTHLY);
export const PRICE_YEARLY_FMT = fmt(PRICE_YEARLY);
export const YEARLY_SAVING_FMT = fmt(YEARLY_SAVING);
