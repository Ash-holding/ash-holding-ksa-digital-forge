import { useEffect, useState, useCallback } from "react";

export type FavoriteService = {
  catKey: string;
  itemKey: string;
  addedAt: number;
};

const STORAGE_KEY = "ash:favorite-services";
const EVENT = "ash:favorite-services-changed";

function read(): FavoriteService[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: FavoriteService[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function useFavorites() {
  const [items, setItems] = useState<FavoriteService[]>([]);

  useEffect(() => {
    setItems(read());
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isFavorite = useCallback(
    (catKey: string, itemKey: string) =>
      items.some((i) => i.catKey === catKey && i.itemKey === itemKey),
    [items],
  );

  const toggle = useCallback((catKey: string, itemKey: string) => {
    const current = read();
    const exists = current.some((i) => i.catKey === catKey && i.itemKey === itemKey);
    const next = exists
      ? current.filter((i) => !(i.catKey === catKey && i.itemKey === itemKey))
      : [{ catKey, itemKey, addedAt: Date.now() }, ...current];
    write(next);
    return !exists;
  }, []);

  const remove = useCallback((catKey: string, itemKey: string) => {
    write(read().filter((i) => !(i.catKey === catKey && i.itemKey === itemKey)));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { items, isFavorite, toggle, remove, clear, count: items.length };
}
