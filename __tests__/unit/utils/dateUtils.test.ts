/**
 * Date Utilities Tests
 * Tests for date formatting and calculation functions
 */

// Mock date utility functions since we need them
export const formatGameTime = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  return date.toLocaleDateString('en-US', options);
};

export const getWeekNumber = (date: Date = new Date()): number => {
  const now = date;
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksPassed = Math.floor((now.getTime() - seasonStart.getTime()) / msPerWeek);
  return Math.max(1, Math.min(18, weeksPassed + 1));
};

export const isGameToday = (gameDate: Date): boolean => {
  const today = new Date();
  return gameDate.toDateString() === today.toDateString();
};

export const getTimeUntilGame = (gameDate: Date): string => {
  const now = new Date();
  const diff = gameDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Game started';
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const formatSeasonDates = (seasonYear: number): { start: Date; end: Date } => {
  const start = new Date(seasonYear, 8, 1); // September 1st
  const end = new Date(seasonYear + 1, 0, 31); // January 31st next year
  return { start, end };
};

export const getPlayoffWeeks = (): number[] => {
  // Typical fantasy playoff weeks
  return [15, 16, 17];
};

export const isPlayoffTime = (week: number = getWeekNumber()): boolean => {
  return getPlayoffWeeks().includes(week);
};

export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

describe('Date Utilities', () => {
  describe('formatGameTime', () => {
    it('should format game time correctly', () => {
      const testDate = new Date('2024-01-15T13:00:00Z');
      const formatted = formatGameTime(testDate);
      
      expect(formatted).toContain('Mon'); // Monday
      expect(formatted).toContain('Jan'); // January
      expect(formatted).toContain('15'); // Day
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(10);
    });

    it('should handle different dates consistently', () => {
      const dates = [
        new Date('2024-09-08T13:00:00Z'), // Week 1
        new Date('2024-12-25T20:30:00Z'), // Christmas game
        new Date('2024-01-01T18:00:00Z')  // New Year's Day
      ];

      dates.forEach(date => {
        const formatted = formatGameTime(date);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(5);
      });
    });
  });

  describe('getWeekNumber', () => {
    it('should return correct week for season start', () => {
      const seasonStart = new Date(2024, 8, 1); // Sept 1, 2024
      const week1 = new Date(2024, 8, 8); // Sept 8, 2024 (typical week 1)
      
      expect(getWeekNumber(seasonStart)).toBe(1);
      expect(getWeekNumber(week1)).toBeGreaterThanOrEqual(1);
      expect(getWeekNumber(week1)).toBeLessThanOrEqual(2);
    });

    it('should return valid week numbers', () => {
      const testDates = [
        new Date(2024, 8, 15),  // September
        new Date(2024, 10, 15), // November  
        new Date(2024, 11, 15), // December
        new Date(2025, 0, 15)   // January
      ];

      testDates.forEach(date => {
        const week = getWeekNumber(date);
        expect(week).toBeGreaterThanOrEqual(1);
        expect(week).toBeLessThanOrEqual(18);
        expect(Number.isInteger(week)).toBe(true);
      });
    });

    it('should handle edge cases', () => {
      const veryEarly = new Date(2024, 6, 1); // July
      const veryLate = new Date(2025, 2, 1); // March
      
      // For very early dates, should return week 1
      expect(getWeekNumber(veryEarly)).toBe(1);
      
      // For very late dates, should return week 18 but our implementation caps at reasonable values
      const lateWeek = getWeekNumber(veryLate);
      expect(lateWeek).toBeGreaterThanOrEqual(1);
      expect(lateWeek).toBeLessThanOrEqual(18);
    });
  });

  describe('isGameToday', () => {
    it('should return true for games today', () => {
      const today = new Date();
      const gameToday = new Date(today);
      gameToday.setHours(13, 0, 0, 0); // 1 PM game
      
      expect(isGameToday(gameToday)).toBe(true);
    });

    it('should return false for games on other days', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      expect(isGameToday(tomorrow)).toBe(false);
      expect(isGameToday(yesterday)).toBe(false);
    });

    it('should handle different times on same day', () => {
      const today = new Date();
      const earlyGame = new Date(today);
      const lateGame = new Date(today);
      
      earlyGame.setHours(9, 0, 0, 0);
      lateGame.setHours(23, 59, 0, 0);
      
      expect(isGameToday(earlyGame)).toBe(true);
      expect(isGameToday(lateGame)).toBe(true);
    });
  });

  describe('getTimeUntilGame', () => {
    it('should return "Game started" for past games', () => {
      const pastGame = new Date();
      pastGame.setHours(pastGame.getHours() - 1);
      
      expect(getTimeUntilGame(pastGame)).toBe('Game started');
    });

    it('should format time correctly for future games', () => {
      const futureGame = new Date();
      futureGame.setHours(futureGame.getHours() + 2);
      futureGame.setMinutes(futureGame.getMinutes() + 30);
      
      const timeUntil = getTimeUntilGame(futureGame);
      expect(timeUntil).toMatch(/\d+[hm]/); // Should contain hours or minutes
    });

    it('should handle games days away', () => {
      const distantGame = new Date();
      distantGame.setDate(distantGame.getDate() + 3);
      
      const timeUntil = getTimeUntilGame(distantGame);
      expect(timeUntil).toContain('d'); // Should show days
      expect(timeUntil).toMatch(/\d+d \d+h/);
    });

    it('should handle edge cases', () => {
      const almostNow = new Date();
      almostNow.setMinutes(almostNow.getMinutes() + 1);
      
      const timeUntil = getTimeUntilGame(almostNow);
      expect(timeUntil).toBe('1m');
    });
  });

  describe('formatSeasonDates', () => {
    it('should return correct season dates', () => {
      const { start, end } = formatSeasonDates(2024);
      
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(8); // September (0-indexed)
      expect(start.getDate()).toBe(1);
      
      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(0); // January (0-indexed)
      expect(end.getDate()).toBe(31);
    });

    it('should work for different years', () => {
      const years = [2020, 2021, 2022, 2023, 2024];
      
      years.forEach(year => {
        const { start, end } = formatSeasonDates(year);
        expect(start.getFullYear()).toBe(year);
        expect(end.getFullYear()).toBe(year + 1);
        expect(end.getTime()).toBeGreaterThan(start.getTime());
      });
    });
  });

  describe('getPlayoffWeeks', () => {
    it('should return correct playoff weeks', () => {
      const playoffWeeks = getPlayoffWeeks();
      
      expect(Array.isArray(playoffWeeks)).toBe(true);
      expect(playoffWeeks).toEqual([15, 16, 17]);
      expect(playoffWeeks.length).toBe(3);
    });

    it('should contain valid week numbers', () => {
      const playoffWeeks = getPlayoffWeeks();
      
      playoffWeeks.forEach(week => {
        expect(week).toBeGreaterThanOrEqual(1);
        expect(week).toBeLessThanOrEqual(18);
        expect(Number.isInteger(week)).toBe(true);
      });
    });
  });

  describe('isPlayoffTime', () => {
    it('should correctly identify playoff weeks', () => {
      expect(isPlayoffTime(15)).toBe(true);
      expect(isPlayoffTime(16)).toBe(true);
      expect(isPlayoffTime(17)).toBe(true);
    });

    it('should correctly identify regular season weeks', () => {
      expect(isPlayoffTime(1)).toBe(false);
      expect(isPlayoffTime(10)).toBe(false);
      expect(isPlayoffTime(14)).toBe(false);
      expect(isPlayoffTime(18)).toBe(false);
    });

    it('should use current week when no parameter provided', () => {
      const result = isPlayoffTime();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formatTimeAgo', () => {
    it('should format recent times correctly', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      expect(formatTimeAgo(fiveMinutesAgo)).toBe('5 minutes ago');
      expect(formatTimeAgo(oneHourAgo)).toBe('1 hour ago');
      expect(formatTimeAgo(twoDaysAgo)).toBe('2 days ago');
    });

    it('should handle singular and plural correctly', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      
      expect(formatTimeAgo(oneMinuteAgo)).toBe('1 minute ago');
      expect(formatTimeAgo(twoMinutesAgo)).toBe('2 minutes ago');
    });

    it('should handle very recent times', () => {
      const now = new Date();
      const fiveSecondsAgo = new Date(now.getTime() - 5 * 1000);
      
      expect(formatTimeAgo(fiveSecondsAgo)).toBe('Just now');
    });

    it('should handle edge cases', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 60 * 1000);
      
      // Future dates should still work (negative time ago)
      const result = formatTimeAgo(future);
      expect(typeof result).toBe('string');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      
      expect(() => formatGameTime(invalidDate)).not.toThrow();
      expect(() => isGameToday(invalidDate)).not.toThrow();
      expect(() => getTimeUntilGame(invalidDate)).not.toThrow();
    });

    it('should be performant with many operations', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const testDate = new Date(2024, 0, 1 + i);
        getWeekNumber(testDate);
        isGameToday(testDate);
        formatTimeAgo(testDate);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 3000 operations in under 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should handle timezone changes appropriately', () => {
      const date = new Date('2024-01-15T13:00:00Z');
      const formatted = formatGameTime(date);
      
      // Should include timezone info
      expect(formatted).toMatch(/[A-Z]{3,4}$/); // Timezone abbreviation at end
    });

    it('should maintain consistency across multiple calls', () => {
      const testDate = new Date('2024-09-15T13:00:00Z');
      
      // Multiple calls should return same result
      expect(getWeekNumber(testDate)).toBe(getWeekNumber(testDate));
      expect(isGameToday(testDate)).toBe(isGameToday(testDate));
      expect(formatGameTime(testDate)).toBe(formatGameTime(testDate));
    });
  });
});