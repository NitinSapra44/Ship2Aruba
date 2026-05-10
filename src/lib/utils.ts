import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function generateSuiteNumber() {
  return `ARB-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function formatWeight(kg: number) {
  return `${kg.toFixed(2)} kg`;
}

export function formatDimensions(w: number, h: number, l: number) {
  return `${w} × ${h} × ${l} cm`;
}
