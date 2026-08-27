/* ---------------------------------------------------------------------------
   Избранные новости — единое состояние на одном хранилище (localStorage).
   Используется в трёх местах: меню карточки новости, экран открытой новости,
   раздел «Избранное» в «Все новости». Все они читают/пишут отсюда, поэтому
   состояние синхронно и переживает перезагрузку (как закрытые плашки Главной).
--------------------------------------------------------------------------- */

import { useSyncExternalStore } from "react";

const FAVORITES_KEY = "cevba-news-favorites";

function loadFavorites(): Set<string> {
  try {
    const arr: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) return new Set(arr);
  } catch {
    /* повреждённые данные — считаем, что избранного нет */
  }
  return new Set();
}

let favorites: Set<string> = loadFavorites();
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function isFavorite(id: string): boolean {
  return favorites.has(id);
}

/** Переключить избранное; возвращает true, если новость добавлена. */
export function toggleFavorite(id: string): boolean {
  const next = new Set(favorites);
  const added = !next.has(id);
  if (added) next.add(id);
  else next.delete(id);
  favorites = next;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
  } catch {
    /* приватный режим — состояние живёт хотя бы в текущей сессии */
  }
  listeners.forEach((l) => l());
  return added;
}

/** Реактивный набор избранного — перерисовывает подписчиков при изменении. */
export function useFavorites(): Set<string> {
  return useSyncExternalStore(subscribe, () => favorites, () => favorites);
}
