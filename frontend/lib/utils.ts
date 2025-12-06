// Utility functions for date and time calculations

export function calculateTradeProtectionDate(): Date {
  // Trade protection is 7 days from now
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

/**
 * Calculates tradableAfter date using Valve time
 * Valve counts days from 9am GMT+1 (which is 8am UTC)
 * @param days - Number of days to add (1-7)
 * @returns Date when item becomes tradable
 */
export function calculateValveTradeLockDate(days: number): Date {
  const now = new Date();
  
  // Get current UTC time
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  
  // Find the next 8am UTC (9am GMT+1)
  // Create date for today at 8am UTC
  const nextValveDay = new Date(Date.UTC(utcYear, utcMonth, utcDate, 8, 0, 0, 0));
  
  // If we've already passed 8am UTC today, move to tomorrow
  if (utcHours > 8 || (utcHours === 8 && utcMinutes > 0)) {
    nextValveDay.setUTCDate(nextValveDay.getUTCDate() + 1);
  }
  
  // Add the specified number of days
  nextValveDay.setUTCDate(nextValveDay.getUTCDate() + days);
  
  return nextValveDay;
}

export function getTimeRemaining(targetDate: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
  };
}

export function formatTimeRemaining(targetDate: Date): string {
  const remaining = getTimeRemaining(targetDate);
  
  if (remaining.isExpired) {
    return 'Trade protection expired';
  }

  if (remaining.days > 0) {
    return `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`;
  } else if (remaining.hours > 0) {
    return `${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`;
  } else if (remaining.minutes > 0) {
    return `${remaining.minutes}m ${remaining.seconds}s`;
  } else {
    return `${remaining.seconds}s`;
  }
}

export function formatCurrency(value: number, locale: string = 'en-US', currency: string = 'USD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

