import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bookedup_favorites_v1';

export async function getFavorites(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(barberId: string): Promise<boolean> {
  const favs = await getFavorites();
  const idx = favs.indexOf(barberId);
  if (idx >= 0) {
    favs.splice(idx, 1);
    await AsyncStorage.setItem(KEY, JSON.stringify(favs));
    return false;
  } else {
    favs.push(barberId);
    await AsyncStorage.setItem(KEY, JSON.stringify(favs));
    return true;
  }
}

/** Returns a stable color index 0-4 for a given barber id */
export function barberColorIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 5;
}

export const CARD_GRADIENTS = [
  ['#7c3aed', '#4f1d96'],
  ['#2563eb', '#1e3a8a'],
  ['#059669', '#064e3b'],
  ['#dc2626', '#7f1d1d'],
  ['#d97706', '#78350f'],
];
