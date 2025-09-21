'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Player, Position } from '@/types/fantasy';

// Search interfaces
export interface SearchFilter {
  id: string;
  label: string;
  type: 'text' | 'select' | 'range' | 'boolean' | 'multiselect';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  value?: any;
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  sort?: SearchSort;
  createdAt: Date;
  lastUsed: Date;
  category: string;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'player' | 'team' | 'position' | 'query' | 'filter';
  category?: string;
  icon?: string;
  metadata?: any;
}

export interface SearchAnalytics {
  popularQueries: string[];
  popularFilters: Record<string, number>;
  recentSearches: string[];
  searchTrends: { query: string; count: number; date: Date }[];
}

// Search context
interface SearchContextValue {
  // Current search state
  query: string;
  filters: Record<string, any>;
  sort: SearchSort | null;
  results: any[];
  isLoading: boolean;
  
  // Search actions
  setQuery: (query: string) => void;
  setFilter: (filterId: string, value: any) => void;
  clearFilter: (filterId: string) => void;
  clearAllFilters: () => void;
  setSort: (sort: SearchSort | null) => void;
  performSearch: () => void;
  
  // Suggestions
  suggestions: SearchSuggestion[];
  getSuggestions: (input: string) => Promise<SearchSuggestion[]>;
  
  // Saved searches
  savedSearches: SavedSearch[];
  saveCurrentSearch: (name: string, category: string) => void;
  loadSavedSearch: (searchId: string) => void;
  deleteSavedSearch: (searchId: string) => void;
  
  // Analytics
  analytics: SearchAnalytics;
  recordSearch: (query: string, filters: Record<string, any>) => void;
  
  // Configuration
  availableFilters: SearchFilter[];
  availableSorts: SearchSort[];
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

// Extended Player interface for search mock data
interface SearchPlayer extends Omit<Player, 'stats'> {
  team: string;
  fantasyPoints: number;
  projectedPoints: number;
  isInjured: boolean;
  injuryStatus: string;
  bye: number;
  tier: number;
  adp: number;
  ownership: number;
  stats: {
    passingYards?: number;
    passingTouchdowns?: number;
    interceptions?: number;
    rushingYards?: number;
    rushingTouchdowns?: number;
    receptions?: number;
    receivingYards?: number;
    receivingTouchdowns?: number;
  };
}

// Mock data for demonstration
const mockPlayers: SearchPlayer[] = [
  {
    id: '1',
    nflId: 'nfl1',
    name: 'Josh Allen',
    position: Position.QB,
    nflTeam: 'BUF',
    team: 'BUF',
    status: 'Active' as any,
    isRookie: false,
    yearsExperience: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
    fantasyPoints: 285.4,
    projectedPoints: 24.2,
    averagePoints: 22.8,
    isInjured: false,
    injuryStatus: 'Healthy',
    bye: 7,
    tier: 1,
    adp: 12.5,
    ownership: 85.2,
    stats: {
      passingYards: 4300,
      passingTouchdowns: 25,
      interceptions: 8,
      rushingYards: 450,
      rushingTouchdowns: 8
    }
  },
  {
    id: '2',
    nflId: 'nfl2',
    name: 'Christian McCaffrey',
    position: Position.RB,
    nflTeam: 'SF',
    team: 'SF',
    status: 'Active' as any,
    isRookie: false,
    yearsExperience: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
    fantasyPoints: 298.7,
    projectedPoints: 21.8,
    averagePoints: 23.9,
    isInjured: false,
    injuryStatus: 'Healthy',
    bye: 9,
    tier: 1,
    adp: 2.1,
    ownership: 92.5,
    stats: {
      rushingYards: 1200,
      rushingTouchdowns: 12,
      receptions: 85,
      receivingYards: 650,
      receivingTouchdowns: 4
    }
  }
];

// Default filters configuration
const defaultFilters: SearchFilter[] = [
  {
    id: 'position',
    label: 'Position',
    type: 'multiselect',
    options: [
      { value: 'QB', label: 'Quarterback' },
      { value: 'RB', label: 'Running Back' },
      { value: 'WR', label: 'Wide Receiver' },
      { value: 'TE', label: 'Tight End' },
      { value: 'K', label: 'Kicker' },
      { value: 'DEF', label: 'Defense' }
    ]
  },
  {
    id: 'team',
    label: 'Team',
    type: 'select',
    options: [
      { value: 'BUF', label: 'Buffalo Bills' },
      { value: 'SF', label: 'San Francisco 49ers' },
      { value: 'KC', label: 'Kansas City Chiefs' },
      { value: 'DAL', label: 'Dallas Cowboys' }
    ]
  },
  {
    id: 'fantasyPoints',
    label: 'Fantasy Points',
    type: 'range',
    min: 0,
    max: 400
  },
  {
    id: 'projectedPoints',
    label: 'Projected Points',
    type: 'range',
    min: 0,
    max: 30
  },
  {
    id: 'tier',
    label: 'Player Tier',
    type: 'select',
    options: [
      { value: '1', label: 'Tier 1 (Elite)' },
      { value: '2', label: 'Tier 2 (Very Good)' },
      { value: '3', label: 'Tier 3 (Good)' },
      { value: '4', label: 'Tier 4 (Average)' },
      { value: '5', label: 'Tier 5 (Below Average)' }
    ]
  },
  {
    id: 'isInjured',
    label: 'Injury Status',
    type: 'boolean'
  },
  {
    id: 'ownership',
    label: 'Ownership %',
    type: 'range',
    min: 0,
    max: 100
  }
];

const defaultSorts: SearchSort[] = [
  { field: 'fantasyPoints', direction: 'desc', label: 'Fantasy Points (High to Low)' },
  { field: 'fantasyPoints', direction: 'asc', label: 'Fantasy Points (Low to High)' },
  { field: 'projectedPoints', direction: 'desc', label: 'Projected Points (High to Low)' },
  { field: 'name', direction: 'asc', label: 'Name (A to Z)' },
  { field: 'position', direction: 'asc', label: 'Position' },
  { field: 'team', direction: 'asc', label: 'Team' },
  { field: 'adp', direction: 'asc', label: 'ADP (Early to Late)' },
  { field: 'ownership', direction: 'desc', label: 'Ownership % (High to Low)' }
];

// Search Provider Component
export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState<SearchSort | null>(defaultSorts[0]);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions] = useState<SearchSuggestion[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics>({
    popularQueries: ['Josh Allen', 'Christian McCaffrey', 'QB rankings', 'waiver wire'],
    popularFilters: { position: 150, team: 89, fantasyPoints: 67 },
    recentSearches: [],
    searchTrends: []
  });

  // Load saved data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('astral-field-saved-searches');
      if (saved) {
        const parsedSaves = JSON.parse(saved).map((search: any) => ({
          ...search,
          createdAt: new Date(search.createdAt),
          lastUsed: new Date(search.lastUsed)
        }));
        setSavedSearches(parsedSaves);
      }

      const analyticsData = localStorage.getItem('astral-field-search-analytics');
      if (analyticsData) {
        const parsedAnalytics = JSON.parse(analyticsData);
        setAnalytics({
          ...parsedAnalytics,
          searchTrends: parsedAnalytics.searchTrends.map((trend: any) => ({
            ...trend,
            date: new Date(trend.date)
          }))
        });
      }
    } catch (error) {
      // Error loading search data
    }
  }, []);

  // Save data to localStorage
  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // Error saving search data
    }
  }, []);

  // Filter and sort results
  const filterAndSort = useCallback((data: any[], searchQuery: string, appliedFilters: Record<string, any>, appliedSort: SearchSort | null) => {
    let filtered = [...data];

    // Text search
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.position?.toLowerCase().includes(searchLower) ||
          item.team?.toLowerCase().includes(searchLower) ||
          item.injuryStatus?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply filters
    Object.entries(appliedFilters).forEach(([filterId, value]) => {
      if (value === undefined || value === null || value === '') return;

      const filter = defaultFilters.find(f => f.id === filterId);
      if (!filter) return;

      switch (filter.type) {
        case 'select':
          if (value) {
            filtered = filtered.filter(item => item[filterId] === value);
          }
          break;
        case 'multiselect':
          if (Array.isArray(value) && value.length > 0) {
            filtered = filtered.filter(item => value.includes(item[filterId]));
          }
          break;
        case 'range':
          if (Array.isArray(value) && value.length === 2) {
            const [min, max] = value;
            filtered = filtered.filter(item => {
              const itemValue = item[filterId];
              return itemValue >= min && itemValue <= max;
            });
          }
          break;
        case 'boolean':
          if (typeof value === 'boolean') {
            filtered = filtered.filter(item => Boolean(item[filterId]) === value);
          }
          break;
      }
    });

    // Apply sorting
    if (appliedSort) {
      filtered.sort((a, b) => {
        const aValue = a[appliedSort.field];
        const bValue = b[appliedSort.field];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return appliedSort.direction === 'asc' ? comparison : -comparison;
        }
        
        const comparison = (aValue || 0) - (bValue || 0);
        return appliedSort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, []);

  // Analytics
  const recordSearch = useCallback((searchQuery: string, _searchFilters?: Record<string, any>) => {
    const updatedAnalytics = {
      ...analytics,
      recentSearches: [searchQuery, ...analytics.recentSearches.filter(q => q !== searchQuery)].slice(0, 10),
      searchTrends: [
        ...analytics.searchTrends,
        { query: searchQuery, count: 1, date: new Date() }
      ].slice(-100)
    };

    setAnalytics(updatedAnalytics);
    saveToStorage('astral-field-search-analytics', updatedAnalytics);
  }, [analytics, saveToStorage]);

  // Perform search
  const performSearch = useCallback(async () => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const filtered = filterAndSort(mockPlayers, query, filters, sort);
    setResults(filtered);
    setIsLoading(false);
    
    // Record search analytics
    if (query.trim()) {
      recordSearch(query, filters);
    }
  }, [query, filters, sort, filterAndSort, recordSearch]);

  // Generate search suggestions
  const getSuggestions = useCallback(async (input: string): Promise<SearchSuggestion[]> => {
    if (!input.trim()) return [];

    const suggestions: SearchSuggestion[] = [];
    const inputLower = input.toLowerCase();

    // Player name suggestions
    mockPlayers.forEach(player => {
      if (player.name.toLowerCase().includes(inputLower)) {
        suggestions.push({
          id: `player-${player.id}`,
          text: player.name,
          type: 'player',
          category: `${player.position} - ${player.team}`,
          icon: 'user'
        });
      }
    });

    // Team suggestions
    const teams = Array.from(new Set(mockPlayers.map(p => p.team)));
    teams.forEach(team => {
      if (team.toLowerCase().includes(inputLower)) {
        suggestions.push({
          id: `team-${team}`,
          text: team,
          type: 'team',
          category: 'Team',
          icon: 'shield'
        });
      }
    });

    // Position suggestions
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    positions.forEach(position => {
      if (position.toLowerCase().includes(inputLower)) {
        suggestions.push({
          id: `position-${position}`,
          text: position,
          type: 'position',
          category: 'Position',
          icon: 'target'
        });
      }
    });

    // Popular query suggestions
    analytics.popularQueries.forEach(popularQuery => {
      if (popularQuery.toLowerCase().includes(inputLower)) {
        suggestions.push({
          id: `query-${popularQuery}`,
          text: popularQuery,
          type: 'query',
          category: 'Popular Search',
          icon: 'trending-up'
        });
      }
    });

    return suggestions.slice(0, 10);
  }, [analytics.popularQueries]);

  // Filter management
  const setFilter = useCallback((filterId: string, value: any) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  }, []);

  const clearFilter = useCallback((filterId: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterId];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Saved search management
  const saveCurrentSearch = useCallback((name: string, category: string) => {
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name,
      query,
      filters,
      sort: sort || undefined,
      createdAt: new Date(),
      lastUsed: new Date(),
      category
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    saveToStorage('astral-field-saved-searches', updated);
  }, [query, filters, sort, savedSearches, saveToStorage]);

  const loadSavedSearch = useCallback((searchId: string) => {
    const search = savedSearches.find(s => s.id === searchId);
    if (search) {
      setQuery(search.query);
      setFilters(search.filters);
      setSort(search.sort || null);
      
      // Update last used timestamp
      const updated = savedSearches.map(s => 
        s.id === searchId ? { ...s, lastUsed: new Date() } : s
      );
      setSavedSearches(updated);
      saveToStorage('astral-field-saved-searches', updated);
      
      // Perform the search
      setTimeout(() => performSearch(), 100);
    }
  }, [savedSearches, saveToStorage, performSearch]);

  const deleteSavedSearch = useCallback((searchId: string) => {
    const updated = savedSearches.filter(s => s.id !== searchId);
    setSavedSearches(updated);
    saveToStorage('astral-field-saved-searches', updated);
  }, [savedSearches, saveToStorage]);



  // Perform search when dependencies change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [performSearch]);

  const value: SearchContextValue = {
    query,
    filters,
    sort,
    results,
    isLoading,
    setQuery,
    setFilter,
    clearFilter,
    clearAllFilters,
    setSort,
    performSearch,
    suggestions,
    getSuggestions,
    savedSearches,
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    analytics,
    recordSearch,
    availableFilters: defaultFilters,
    availableSorts: defaultSorts
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

// Hook to use search context
export const useSearch = (): SearchContextValue => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

// Utility functions for search
export const generateSearchSuggestions = (input: string, data: any[]): SearchSuggestion[] => {
  // This is a utility function that can be used standalone
  const suggestions: SearchSuggestion[] = [];
  const inputLower = input.toLowerCase();

  data.forEach(item => {
    if (item.name?.toLowerCase().includes(inputLower)) {
      suggestions.push({
        id: `item-${item.id}`,
        text: item.name,
        type: 'player',
        category: item.category || 'Item'
      });
    }
  });

  return suggestions.slice(0, 5);
};

export const applyAdvancedFilters = (
  data: any[],
  filters: Record<string, any>,
  searchConfig: SearchFilter[]
): any[] => {
  let filtered = [...data];

  Object.entries(filters).forEach(([filterId, value]) => {
    const config = searchConfig.find(f => f.id === filterId);
    if (!config || !value) return;

    switch (config.type) {
      case 'text':
        if (typeof value === 'string' && value.trim()) {
          filtered = filtered.filter(item => 
            String(item[filterId] || '').toLowerCase().includes(value.toLowerCase())
          );
        }
        break;
      case 'select':
        filtered = filtered.filter(item => item[filterId] === value);
        break;
      case 'multiselect':
        if (Array.isArray(value) && value.length > 0) {
          filtered = filtered.filter(item => value.includes(item[filterId]));
        }
        break;
      case 'range':
        if (Array.isArray(value) && value.length === 2) {
          const [min, max] = value;
          filtered = filtered.filter(item => {
            const itemValue = Number(item[filterId]) || 0;
            return itemValue >= min && itemValue <= max;
          });
        }
        break;
      case 'boolean':
        if (typeof value === 'boolean') {
          filtered = filtered.filter(item => Boolean(item[filterId]) === value);
        }
        break;
    }
  });

  return filtered;
};