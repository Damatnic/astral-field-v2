/**
 * Zenith User Test Fixtures
 * Standardized user data for consistent testing
 */

export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: new Date('2024-01-01'),
  role: 'PLAYER',
  teamName: 'Test Team',
  hashedPassword: '$2a$10$test.hashed.password',
  avatar: null,
  profileId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isAdmin: false,
  lastActiveAt: new Date(),
  notificationSettings: null,
  onboardingCompleted: true,
  onboardingCompletedAt: new Date('2024-01-01'),
  onboardingSteps: null,
  ...overrides,
})

export const createMockAdmin = (overrides = {}) => createMockUser({
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN',
  isAdmin: true,
  ...overrides,
})

export const createMockCommissioner = (overrides = {}) => createMockUser({
  id: 'commissioner-1',
  email: 'commissioner@example.com',
  name: 'Commissioner User',
  role: 'COMMISSIONER',
  ...overrides,
})

export const createMockUserList = (count = 3) => {
  return Array.from({ length: count }, (_, index) => createMockUser({
    id: `user-${index + 1}`,
    email: `user${index + 1}@example.com`,
    name: `User ${index + 1}`,
  }))
}

export const mockUserCredentials = {
  valid: {
    email: 'test@example.com',
    password: 'password123',
  },
  invalid: {
    email: 'wrong@example.com',
    password: 'wrongpassword',
  },
  malformed: {
    email: 'not-an-email',
    password: '123',
  },
}

export const mockAuthSessions = {
  valid: {
    user: createMockUser(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  expired: {
    user: createMockUser(),
    expires: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  null: null,
}