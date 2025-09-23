import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeToggle, ThemeToggleCompact } from '@/components/ThemeToggle';
import { ThemeProvider } from '@/components/ThemeProvider';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
});

const renderWithThemeProvider = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render toggle button', () => {
    renderWithThemeProvider(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('should show sun icon in light mode', () => {
    renderWithThemeProvider(<ThemeToggle />);
    
    // Sun icon should be visible in light mode
    const sunIcon = document.querySelector('[data-lucide="sun"]');
    expect(sunIcon).toBeInTheDocument();
  });

  it('should toggle theme when clicked', () => {
    renderWithThemeProvider(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should change aria-label after click
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('should show tooltip on hover', () => {
    renderWithThemeProvider(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    
    // Tooltip should appear with hover
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('should have correct CSS classes for styling', () => {
    renderWithThemeProvider(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('relative', 'p-2', 'rounded-lg');
  });
});

describe('ThemeToggleCompact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render compact toggle button', () => {
    renderWithThemeProvider(<ThemeToggleCompact />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('should have compact styling', () => {
    renderWithThemeProvider(<ThemeToggleCompact />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('p-2', 'rounded-md');
  });

  it('should toggle theme when clicked', () => {
    renderWithThemeProvider(<ThemeToggleCompact />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('should show moon icon in light mode', () => {
    renderWithThemeProvider(<ThemeToggleCompact />);
    
    const moonIcon = document.querySelector('[data-lucide="moon"]');
    expect(moonIcon).toBeInTheDocument();
  });

  it('should show sun icon in dark mode', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    renderWithThemeProvider(<ThemeToggleCompact />);
    
    const sunIcon = document.querySelector('[data-lucide="sun"]');
    expect(sunIcon).toBeInTheDocument();
  });
});

describe('Theme Toggle Integration', () => {
  it('should work with different initial themes', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    
    renderWithThemeProvider(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('should handle rapid clicks', () => {
    renderWithThemeProvider(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    
    // Rapid clicks
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    // Should end up in dark mode (odd number of clicks)
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('should maintain accessibility during theme changes', () => {
    renderWithThemeProvider(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    
    // Initial state
    expect(button).toHaveAttribute('aria-label');
    
    // After toggle
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label');
    
    // Should always have an aria-label
    expect(button.getAttribute('aria-label')).toBeTruthy();
  });
});