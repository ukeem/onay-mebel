/**
 * Сокращает URL через бэкенд-прокси (/api/public/shorten → clck.ru).
 * При ошибке возвращает оригинальный URL.
 */
export async function shortenUrl(url: string): Promise<string> {
  try {
    const res = await fetch(
      `/api/public/shorten?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) return url;
    const data = await res.json();
    return data.short || url;
  } catch {
    return url;
  }
}
