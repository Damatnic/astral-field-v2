#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class TestingSuiteSetup {
  private testingDeps = {
    // Core testing libraries
    jest: '^29.7.0',
    '@types/jest': '^29.5.8',
    'ts-jest': '^29.1.1',
    
    // React testing
    '@testing-library/react': '^14.1.0',
    '@testing-library/jest-dom': '^6.1.4',
    '@testing-library/user-event': '^14.5.1',
    '@testing-library/react-hooks': '^8.0.1',
    
    // E2E testing
    '@playwright/test': '^1.40.0',
    
    // Mocking
    'msw': '^2.0.0',
    '@mswjs/data': '^0.16.1',
    
    // Coverage
    'nyc': '^15.1.0',
    'c8': '^8.0.1'
  };

  async setup(): Promise<void> {
    console.log('\n🧪 AUTOMATED TESTING SUITE SETUP\n');
    console.log('═'.repeat(60));

    // Step 1: Install dependencies
    await this.installDependencies();
    
    // Step 2: Create Jest configuration
    await this.createJestConfig();
    
    // Step 3: Create testing utilities
    await this.createTestingUtilities();
    
    // Step 4: Create example tests
    await this.createExampleTests();
    
    // Step 5: Create E2E setup
    await this.createE2ESetup();
    
    // Step 6: Update package.json scripts
    await this.updatePackageScripts();

    console.log('\n✅ Testing suite setup complete!');
    this.displayNextSteps();
  }

  private async installDependencies(): Promise<void> {
    console.log('📦 Installing testing dependencies...');
    
    const deps = Object.entries(this.testingDeps)
      .map(([pkg, version]) => `${pkg}@${version}`)
      .join(' ');
    
    try {
      await execAsync(`npm install --save-dev ${deps}`);
      console.log('✅ Dependencies installed');
    } catch (error) {
      console.log('⚠️  Failed to install dependencies. Please install manually:');
      console.log(`   npm install --save-dev ${deps}`);
    }
  }

  private async createJestConfig(): Promise<void> {
    const jestConfig = `import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx'
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/build/'
  ]
};

export default config;`;

    await fs.writeFile('jest.config.ts', jestConfig, 'utf-8');
    console.log('✅ Created jest.config.ts');

    // Create jest.setup.ts
    const jestSetup = `import '@testing-library/jest-dom';
import { server } from './__tests__/mocks/server';

// Enable API mocking
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});`;

    await fs.writeFile('jest.setup.ts', jestSetup, 'utf-8');
    console.log('✅ Created jest.setup.ts');
  }

  private async createTestingUtilities(): Promise<void> {
    // Create testing utilities directory
    await fs.mkdir('__tests__/utils', { recursive: true });
    
    // Create render helper
    const renderHelper = `import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';

interface ProvidersProps {
  children: React.ReactNode;
}

function Providers({ children }: ProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <SessionProvider session={null}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return rtlRender(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };`;

    await fs.writeFile('__tests__/utils/test-utils.tsx', renderHelper, 'utf-8');
    console.log('✅ Created testing utilities');

    // Create MSW setup
    await fs.mkdir('__tests__/mocks', { recursive: true });
    
    const mswServer = `import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);`;

    await fs.writeFile('__tests__/mocks/server.ts', mswServer, 'utf-8');

    const mswHandlers = `import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      token: 'mock-jwt-token'
    });
  }),

  // User endpoints
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      email: 'user@example.com',
      name: 'User Name'
    });
  }),

  // Matchup endpoints
  http.get('/api/matchups', () => {
    return HttpResponse.json({
      data: [],
      total: 0,
      page: 1,
      limit: 10
    });
  }),
];`;

    await fs.writeFile('__tests__/mocks/handlers.ts', mswHandlers, 'utf-8');
    console.log('✅ Created MSW mock server');
  }

  private async createExampleTests(): Promise<void> {
    // Create example unit test
    const unitTest = `import { describe, it, expect, jest } from '@jest/globals';

describe('Example Unit Test', () => {
  it('should add two numbers correctly', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 3)).toBe(5);
  });

  it('should handle async operations', async () => {
    const fetchData = jest.fn().mockResolvedValue({ data: 'test' });
    const result = await fetchData();
    expect(result.data).toBe('test');
    expect(fetchData).toHaveBeenCalledTimes(1);
  });
});`;

    await fs.writeFile('__tests__/unit/example.test.ts', unitTest, 'utf-8');

    // Create example component test
    const componentTest = `import { render, screen, fireEvent } from '../utils/test-utils';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
  });
});`;

    await fs.mkdir('__tests__/components', { recursive: true });
    await fs.writeFile('__tests__/components/button.test.tsx', componentTest, 'utf-8');

    // Create example integration test
    const integrationTest = `import { render, screen, waitFor } from '../utils/test-utils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('API Integration', () => {
  it('fetches and displays user data', async () => {
    // Override the default handler for this test
    server.use(
      http.get('/api/users/1', () => {
        return HttpResponse.json({
          id: '1',
          name: 'John Doe',
          email: 'john@example.com'
        });
      })
    );

    // Render component that fetches user data
    const UserProfile = () => {
      const [user, setUser] = React.useState(null);
      
      React.useEffect(() => {
        fetch('/api/users/1')
          .then(res => res.json())
          .then(data => setUser(data));
      }, []);
      
      if (!user) return <div>Loading...</div>;
      return <div>{user.name}</div>;
    };

    render(<UserProfile />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});`;

    await fs.mkdir('__tests__/integration', { recursive: true });
    await fs.writeFile('__tests__/integration/api.test.tsx', integrationTest, 'utf-8');
    
    console.log('✅ Created example tests');
  }

  private async createE2ESetup(): Promise<void> {
    // Create Playwright config
    const playwrightConfig = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});`;

    await fs.writeFile('playwright.config.ts', playwrightConfig, 'utf-8');
    
    // Create example E2E test
    await fs.mkdir('e2e', { recursive: true });
    
    const e2eTest = `import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display main content', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Check for navigation
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Check for footer
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that mobile menu button is visible
    const menuButton = page.getByRole('button', { name: /menu/i });
    await expect(menuButton).toBeVisible();
    
    // Open mobile menu
    await menuButton.click();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});`;

    await fs.writeFile('e2e/homepage.spec.ts', e2eTest, 'utf-8');
    console.log('✅ Created E2E testing setup');
  }

  private async updatePackageScripts(): Promise<void> {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      
      packageJson.scripts = {
        ...packageJson.scripts,
        'test': 'jest',
        'test:unit': 'jest __tests__/unit',
        'test:integration': 'jest __tests__/integration',
        'test:components': 'jest __tests__/components',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        'test:ci': 'jest --ci --coverage --maxWorkers=2',
        'test:e2e': 'playwright test',
        'test:e2e:ui': 'playwright test --ui',
        'test:e2e:debug': 'playwright test --debug',
        'test:all': 'npm run test:ci && npm run test:e2e',
        'coverage:view': 'open coverage/lcov-report/index.html'
      };
      
      await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2), 'utf-8');
      console.log('✅ Updated package.json scripts');
    } catch (error) {
      console.log('⚠️  Please add the following scripts to package.json manually:');
      console.log(`
  "test": "jest",
  "test:unit": "jest __tests__/unit",
  "test:integration": "jest __tests__/integration",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:e2e": "playwright test"
      `);
    }
  }

  private displayNextSteps(): void {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 NEXT STEPS');
    console.log('─'.repeat(60));
    console.log('1. Run tests:');
    console.log('   npm test');
    console.log('\n2. Run tests with coverage:');
    console.log('   npm run test:coverage');
    console.log('\n3. Run E2E tests:');
    console.log('   npm run test:e2e');
    console.log('\n4. Write more tests for your components:');
    console.log('   - Unit tests in __tests__/unit/');
    console.log('   - Component tests in __tests__/components/');
    console.log('   - Integration tests in __tests__/integration/');
    console.log('   - E2E tests in e2e/');
    console.log('\n5. Set coverage thresholds in jest.config.ts');
    console.log('═'.repeat(60));
  }
}

// CLI
async function main() {
  const setup = new TestingSuiteSetup();
  await setup.setup();
}

if (require.main === module) {
  main().catch(console.error);
}

export { TestingSuiteSetup };