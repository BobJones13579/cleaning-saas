import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Configurable business time zone (default: Eastern Time)
export const BUSINESS_TIMEZONE = "America/New_York"; // Change to "America/Sao_Paulo" for Brazil

/**
 * Converts a local time string (in BUSINESS_TIMEZONE) to a UTC ISO string.
 * @param localDateTime - e.g. '2025-02-02T17:00'
 * @returns UTC ISO string (e.g. '2025-02-02T22:00:00Z')
 */
export function convertLocalToUTC(localDateTime: string, tz: string = BUSINESS_TIMEZONE): string {
  return dayjs.tz(localDateTime, tz).utc().toISOString();
}

/**
 * Converts a UTC ISO string to a local time string in BUSINESS_TIMEZONE.
 * @param utcDateTime - UTC ISO string (e.g. '2025-02-02T22:00:00Z')
 * @returns Local time string (e.g. '2025-02-02T17:00')
 */
export function convertUTCToLocal(utcDateTime: string, tz: string = BUSINESS_TIMEZONE): string {
  return dayjs.utc(utcDateTime).tz(tz).format('YYYY-MM-DDTHH:mm');
}

/**
 * Formats a UTC ISO string for display in BUSINESS_TIMEZONE.
 * @param utcDateTime - UTC ISO string
 * @param format - Optional Day.js format string
 * @returns Formatted string (e.g. 'Feb 2, 2025, 5:00 PM')
 */
export function formatUTCForDisplay(utcDateTime: string, tz: string = BUSINESS_TIMEZONE, format = 'MMM D, YYYY, h:mm A'): string {
  return dayjs.utc(utcDateTime).tz(tz).format(format);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper for E.164 phone validation
export function isValidPhone(phone: string) {
  return /^\+\d{10,15}$/.test(phone);
}

// Shared phone normalization utility
export function normalizePhone(phone: string) {
  return phone.replace(/[^+\d]/g, '');
}
