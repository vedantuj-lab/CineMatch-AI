/**
 * CineMatch AI — Procedural Cinematic Artwork Generator
 * Provides elegant, deterministic poster artwork for MovieLens titles with genre-aware palettes.
 */

const GENRE_PALETTES: Record<string, { bg: string; accent: string; secondary: string }> = {
  Action: { bg: 'from-orange-950 via-zinc-900 to-black', accent: '#F97316', secondary: '#EA580C' },
  Adventure: { bg: 'from-amber-950 via-zinc-900 to-black', accent: '#F59E0B', secondary: '#D97706' },
  Animation: { bg: 'from-cyan-950 via-zinc-900 to-black', accent: '#06B6D4', secondary: '#0891B2' },
  Children: { bg: 'from-yellow-950 via-zinc-900 to-black', accent: '#EAB308', secondary: '#CA8A04' },
  Comedy: { bg: 'from-rose-950 via-zinc-900 to-black', accent: '#FB7185', secondary: '#F43F5E' },
  Crime: { bg: 'from-red-950 via-neutral-900 to-black', accent: '#EF4444', secondary: '#DC2626' },
  Documentary: { bg: 'from-emerald-950 via-zinc-900 to-black', accent: '#10B981', secondary: '#059669' },
  Drama: { bg: 'from-indigo-950 via-zinc-900 to-black', accent: '#818CF8', secondary: '#6366F1' },
  Fantasy: { bg: 'from-purple-950 via-zinc-900 to-black', accent: '#C084FC', secondary: '#A855F7' },
  'Film-Noir': { bg: 'from-zinc-900 via-stone-900 to-black', accent: '#D4D4D8', secondary: '#A1A1AA' },
  Horror: { bg: 'from-red-950 via-stone-950 to-black', accent: '#DC2626', secondary: '#991B1B' },
  Mystery: { bg: 'from-violet-950 via-zinc-900 to-black', accent: '#A78BFA', secondary: '#8B5CF6' },
  Romance: { bg: 'from-pink-950 via-zinc-900 to-black', accent: '#F472B6', secondary: '#EC4899' },
  'Sci-Fi': { bg: 'from-sky-950 via-slate-900 to-black', accent: '#38BDF8', secondary: '#0284C7' },
  Thriller: { bg: 'from-amber-950 via-neutral-950 to-black', accent: '#F59E0B', secondary: '#B45309' },
  War: { bg: 'from-stone-900 via-neutral-900 to-black', accent: '#A8A29E', secondary: '#78716C' },
  Western: { bg: 'from-orange-950 via-stone-900 to-black', accent: '#EA580C', secondary: '#C2410C' },
};

const DEFAULT_PALETTE = {
  bg: 'from-zinc-900 via-stone-900 to-black',
  accent: '#F59E0B',
  secondary: '#D97706',
};

export function getMoviePalette(genres: string[] = []) {
  for (const g of genres) {
    if (GENRE_PALETTES[g]) {
      return GENRE_PALETTES[g];
    }
  }
  return DEFAULT_PALETTE;
}

export function getDeterministicNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
