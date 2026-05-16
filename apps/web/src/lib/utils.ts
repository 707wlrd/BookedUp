import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (cents: number, locale = 'fr-FR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);

export const formatDuration = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 ? minutes % 60 : ''}`;

export const formatDate = (date: Date | string, locale = 'fr-FR') =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(date));

export const formatTime = (date: Date | string, locale = 'fr-FR') =>
  new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(date));
