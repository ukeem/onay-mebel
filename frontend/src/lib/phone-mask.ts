/** Format phone input as +7 7XX XXX XX XX */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "+7 ";
  let result = "+7 ";
  const rest = digits.startsWith("7") ? digits.slice(1) : digits;
  if (rest.length > 0) result += rest.slice(0, 3);
  if (rest.length > 3) result += " " + rest.slice(3, 6);
  if (rest.length > 6) result += " " + rest.slice(6, 8);
  if (rest.length > 8) result += " " + rest.slice(8, 10);
  return result;
}

/** Extract raw phone from formatted: +7 700 123 45 67 → +77001234567 */
export function rawPhone(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  return "+" + digits;
}
