import {API_BASE_URL} from '../config';

type Language = 'en' | 'ru' | 'he';

export async function translateFields<T extends Record<string, string>>(
  fields: T,
): Promise<Partial<Record<Language, T>> | undefined> {
  const hasText = Object.values(fields).some(value => value.trim().length > 0);
  if (!hasText) {
    return undefined;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/translate/fields`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({fields}),
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = await response.json();
    return payload.translations as Partial<Record<Language, T>>;
  } catch {
    return undefined;
  }
}
