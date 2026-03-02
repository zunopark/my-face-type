import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * KST 기준 월별 날짜 범위 (ISO string)
 * Supabase gte/lt 필터에 바로 사용 가능
 */
export function kstMonthRange(year: number, month: number) {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const startDate = new Date(Date.UTC(year, month - 1, 1) - KST_OFFSET).toISOString();
  const endDate = new Date(Date.UTC(year, month, 1) - KST_OFFSET).toISOString();
  return { startDate, endDate };
}
