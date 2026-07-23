'use client';

import { useCallback, useEffect, useState } from 'react';

import type { FavoriteProject } from '../types';

const STORAGE_KEY = 'launchlens_favorite_projects';

function readFavorites(): FavoriteProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: FavoriteProject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavoriteProjects() {
  const [favorites, setFavorites] = useState<FavoriteProject[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  const isFavorite = useCallback(
    (projectId: string) => favorites.some((item) => item.id === projectId),
    [favorites],
  );

  const toggleFavorite = useCallback((project: { id: string; title: string }) => {
    setFavorites((prev) => {
      const exists = prev.some((item) => item.id === project.id);
      const next = exists
        ? prev.filter((item) => item.id !== project.id)
        : [{ id: project.id, title: project.title, addedAt: new Date().toISOString() }, ...prev].slice(
            0,
            8,
          );
      writeFavorites(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
