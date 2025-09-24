/**
 * Array Utilities Tests
 * Tests for array manipulation and helper functions
 */

// Mock array utility functions
export const groupBy = <T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

export const sortBy = <T>(
  array: T[],
  keyFn: (item: T) => number | string,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aValue = keyFn(a);
    const bValue = keyFn(b);
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const chunk = <T>(array: T[], size: number): T[][] => {
  if (size <= 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

export const uniqueBy = <T, K>(array: T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const take = <T>(array: T[], count: number): T[] => {
  return array.slice(0, Math.max(0, count));
};

export const drop = <T>(array: T[], count: number): T[] => {
  return array.slice(Math.max(0, count));
};

export const findLastIndex = <T>(array: T[], predicate: (item: T) => boolean): number => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return -1;
};

export const partition = <T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] => {
  const truthy: T[] = [];
  const falsy: T[] = [];
  
  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }
  
  return [truthy, falsy];
};

describe('Array Utilities', () => {
  interface TestPlayer {
    id: string;
    name: string;
    position: string;
    points: number;
    team: string;
  }

  const mockPlayers: TestPlayer[] = [
    { id: '1', name: 'Josh Allen', position: 'QB', points: 24.5, team: 'BUF' },
    { id: '2', name: 'Christian McCaffrey', position: 'RB', points: 18.2, team: 'SF' },
    { id: '3', name: 'Tyreek Hill', position: 'WR', points: 16.8, team: 'MIA' },
    { id: '4', name: 'Travis Kelce', position: 'TE', points: 14.3, team: 'KC' },
    { id: '5', name: 'Saquon Barkley', position: 'RB', points: 17.1, team: 'NYG' },
    { id: '6', name: 'Stefon Diggs', position: 'WR', points: 15.9, team: 'BUF' },
  ];

  describe('groupBy', () => {
    it('should group items by position', () => {
      const grouped = groupBy(mockPlayers, player => player.position);
      
      expect(grouped.QB).toHaveLength(1);
      expect(grouped.RB).toHaveLength(2);
      expect(grouped.WR).toHaveLength(2);
      expect(grouped.TE).toHaveLength(1);
      
      expect(grouped.QB[0].name).toBe('Josh Allen');
      expect(grouped.RB.map(p => p.name)).toEqual(['Christian McCaffrey', 'Saquon Barkley']);
    });

    it('should group items by team', () => {
      const grouped = groupBy(mockPlayers, player => player.team);
      
      expect(grouped.BUF).toHaveLength(2);
      expect(grouped.SF).toHaveLength(1);
      expect(grouped.MIA).toHaveLength(1);
      expect(grouped.KC).toHaveLength(1);
      expect(grouped.NYG).toHaveLength(1);
    });

    it('should handle empty arrays', () => {
      const grouped = groupBy([], () => 'key');
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it('should handle arrays with duplicate keys', () => {
      const duplicatePositions = [
        { id: '1', position: 'QB' },
        { id: '2', position: 'QB' },
        { id: '3', position: 'QB' }
      ];
      
      const grouped = groupBy(duplicatePositions, item => item.position);
      expect(grouped.QB).toHaveLength(3);
    });
  });

  describe('sortBy', () => {
    it('should sort by points ascending', () => {
      const sorted = sortBy(mockPlayers, player => player.points, 'asc');
      
      expect(sorted[0].points).toBe(14.3); // Travis Kelce
      expect(sorted[sorted.length - 1].points).toBe(24.5); // Josh Allen
    });

    it('should sort by points descending', () => {
      const sorted = sortBy(mockPlayers, player => player.points, 'desc');
      
      expect(sorted[0].points).toBe(24.5); // Josh Allen
      expect(sorted[sorted.length - 1].points).toBe(14.3); // Travis Kelce
    });

    it('should sort by name alphabetically', () => {
      const sorted = sortBy(mockPlayers, player => player.name);
      
      expect(sorted[0].name).toBe('Christian McCaffrey');
      expect(sorted[sorted.length - 1].name).toBe('Tyreek Hill');
    });

    it('should not mutate original array', () => {
      const original = [...mockPlayers];
      sortBy(mockPlayers, player => player.points);
      
      expect(mockPlayers).toEqual(original);
    });

    it('should handle empty arrays', () => {
      const sorted = sortBy([], () => 0);
      expect(sorted).toEqual([]);
    });
  });

  describe('chunk', () => {
    it('should split array into chunks of specified size', () => {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const chunks = chunk(numbers, 3);
      
      expect(chunks).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]);
    });

    it('should handle arrays not evenly divisible', () => {
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunk(numbers, 3);
      
      expect(chunks).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7]
      ]);
    });

    it('should handle chunk size larger than array', () => {
      const numbers = [1, 2, 3];
      const chunks = chunk(numbers, 5);
      
      expect(chunks).toEqual([[1, 2, 3]]);
    });

    it('should handle invalid chunk sizes', () => {
      const numbers = [1, 2, 3];
      expect(chunk(numbers, 0)).toEqual([]);
      expect(chunk(numbers, -1)).toEqual([]);
    });

    it('should handle empty arrays', () => {
      expect(chunk([], 3)).toEqual([]);
    });
  });

  describe('unique', () => {
    it('should remove duplicate numbers', () => {
      const numbers = [1, 2, 2, 3, 3, 3, 4];
      const uniqueNumbers = unique(numbers);
      
      expect(uniqueNumbers).toEqual([1, 2, 3, 4]);
    });

    it('should remove duplicate strings', () => {
      const strings = ['a', 'b', 'a', 'c', 'b'];
      const uniqueStrings = unique(strings);
      
      expect(uniqueStrings).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty arrays', () => {
      expect(unique([])).toEqual([]);
    });

    it('should preserve order of first occurrence', () => {
      const numbers = [3, 1, 2, 1, 3];
      const uniqueNumbers = unique(numbers);
      
      expect(uniqueNumbers).toEqual([3, 1, 2]);
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates by custom key', () => {
      const playersWithDuplicates = [
        ...mockPlayers,
        { id: '7', name: 'Duplicate QB', position: 'QB', points: 20, team: 'LAR' }
      ];
      
      const uniqueByPosition = uniqueBy(playersWithDuplicates, player => player.position);
      
      // Should have only one player per position
      const positions = uniqueByPosition.map(p => p.position);
      expect(unique(positions)).toEqual(positions);
    });

    it('should preserve first occurrence', () => {
      const players = [
        { id: '1', name: 'First QB', position: 'QB' },
        { id: '2', name: 'Second QB', position: 'QB' }
      ];
      
      const uniquePlayers = uniqueBy(players, p => p.position);
      expect(uniquePlayers).toHaveLength(1);
      expect(uniquePlayers[0].name).toBe('First QB');
    });

    it('should handle empty arrays', () => {
      expect(uniqueBy([], () => 'key')).toEqual([]);
    });
  });

  describe('shuffle', () => {
    it('should return array with same elements', () => {
      const numbers = [1, 2, 3, 4, 5];
      const shuffled = shuffle(numbers);
      
      expect(shuffled).toHaveLength(5);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should not mutate original array', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      shuffle(original);
      
      expect(original).toEqual(copy);
    });

    it('should handle empty arrays', () => {
      expect(shuffle([])).toEqual([]);
    });

    it('should handle single element arrays', () => {
      expect(shuffle([1])).toEqual([1]);
    });

    it('should produce different results (statistically)', () => {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(shuffle(numbers).join(','));
      }
      
      // Very unlikely all shuffles are identical
      const uniqueResults = unique(results);
      expect(uniqueResults.length).toBeGreaterThan(1);
    });
  });

  describe('take', () => {
    it('should take specified number of elements', () => {
      const numbers = [1, 2, 3, 4, 5];
      expect(take(numbers, 3)).toEqual([1, 2, 3]);
      expect(take(numbers, 1)).toEqual([1]);
      expect(take(numbers, 0)).toEqual([]);
    });

    it('should handle count larger than array length', () => {
      const numbers = [1, 2, 3];
      expect(take(numbers, 5)).toEqual([1, 2, 3]);
    });

    it('should handle negative counts', () => {
      const numbers = [1, 2, 3];
      expect(take(numbers, -1)).toEqual([]);
    });

    it('should not mutate original array', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      take(original, 3);
      
      expect(original).toEqual(copy);
    });
  });

  describe('drop', () => {
    it('should drop specified number of elements', () => {
      const numbers = [1, 2, 3, 4, 5];
      expect(drop(numbers, 2)).toEqual([3, 4, 5]);
      expect(drop(numbers, 1)).toEqual([2, 3, 4, 5]);
      expect(drop(numbers, 0)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle count larger than array length', () => {
      const numbers = [1, 2, 3];
      expect(drop(numbers, 5)).toEqual([]);
    });

    it('should handle negative counts', () => {
      const numbers = [1, 2, 3];
      expect(drop(numbers, -1)).toEqual([1, 2, 3]);
    });

    it('should not mutate original array', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      drop(original, 2);
      
      expect(original).toEqual(copy);
    });
  });

  describe('findLastIndex', () => {
    it('should find last matching index', () => {
      const numbers = [1, 2, 3, 2, 4];
      const lastTwoIndex = findLastIndex(numbers, n => n === 2);
      
      expect(lastTwoIndex).toBe(3);
    });

    it('should return -1 when no match found', () => {
      const numbers = [1, 2, 3, 4, 5];
      const notFoundIndex = findLastIndex(numbers, n => n === 10);
      
      expect(notFoundIndex).toBe(-1);
    });

    it('should work with complex predicates', () => {
      const lastHighScoringPlayer = findLastIndex(
        mockPlayers, 
        player => player.points > 17
      );
      
      expect(lastHighScoringPlayer).toBeGreaterThanOrEqual(0);
      expect(mockPlayers[lastHighScoringPlayer].points).toBeGreaterThan(17);
    });

    it('should handle empty arrays', () => {
      expect(findLastIndex([], () => true)).toBe(-1);
    });
  });

  describe('partition', () => {
    it('should partition array by predicate', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const [evens, odds] = partition(numbers, n => n % 2 === 0);
      
      expect(evens).toEqual([2, 4, 6]);
      expect(odds).toEqual([1, 3, 5]);
    });

    it('should partition players by position', () => {
      const [quarterbacks, others] = partition(
        mockPlayers, 
        player => player.position === 'QB'
      );
      
      expect(quarterbacks).toHaveLength(1);
      expect(others).toHaveLength(5);
      expect(quarterbacks[0].name).toBe('Josh Allen');
    });

    it('should handle all true predicate', () => {
      const numbers = [1, 2, 3];
      const [truthy, falsy] = partition(numbers, () => true);
      
      expect(truthy).toEqual([1, 2, 3]);
      expect(falsy).toEqual([]);
    });

    it('should handle all false predicate', () => {
      const numbers = [1, 2, 3];
      const [truthy, falsy] = partition(numbers, () => false);
      
      expect(truthy).toEqual([]);
      expect(falsy).toEqual([1, 2, 3]);
    });

    it('should handle empty arrays', () => {
      const [truthy, falsy] = partition([], () => true);
      expect(truthy).toEqual([]);
      expect(falsy).toEqual([]);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      
      const startTime = performance.now();
      unique(largeArray);
      sortBy(largeArray, n => n);
      chunk(largeArray, 100);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle mixed data types appropriately', () => {
      const mixedArray = [1, '2', 3, '4', 5];
      
      expect(() => sortBy(mixedArray, x => x)).not.toThrow();
      expect(() => unique(mixedArray)).not.toThrow();
      expect(() => chunk(mixedArray, 2)).not.toThrow();
    });

    it('should maintain immutability', () => {
      const original = [1, 2, 3, 4, 5];
      const functions = [
        () => sortBy(original, x => x),
        () => unique(original),
        () => chunk(original, 2),
        () => shuffle(original),
        () => take(original, 3),
        () => drop(original, 2),
        () => partition(original, x => x > 3)[0]
      ];
      
      const originalCopy = [...original];
      functions.forEach(fn => fn());
      
      expect(original).toEqual(originalCopy);
    });

    it('should handle null and undefined values', () => {
      const arrayWithNulls = [1, null, 3, undefined, 5];
      
      expect(() => unique(arrayWithNulls)).not.toThrow();
      expect(() => chunk(arrayWithNulls, 2)).not.toThrow();
      expect(() => take(arrayWithNulls, 3)).not.toThrow();
    });
  });
});