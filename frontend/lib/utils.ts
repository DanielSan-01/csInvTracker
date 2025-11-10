// Utility functions for date and time calculations

export function calculateTradeProtectionDate(): Date {
  // Trade protection is 7 days from now
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
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

