/**
 * Сокращает URL через clck.ru (Яндекс).
 * При ошибке возвращает оригинальный URL.
 */
export async function shortenUrl(url: string): Promise<string> {
  try {
    const res = await fetch(
      `https://clck.ru/--?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) return url;
    const short = await res.text();
    return short.trim() || url;
  } catch {
    return url;
  }
}
