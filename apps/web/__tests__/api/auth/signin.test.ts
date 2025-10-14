import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/auth/signin'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Mock Prisma
jest.mock('@/lib/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('/api/auth/signin API route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('successfully signs in user with valid credentials', async () => {
    const mockUser = {
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'john@example.com',
        password: 'password123',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('john@example.com')
    expect(data.user.name).toBe('John Doe')
    expect(data.user.password).toBeUndefined() // Password should not be returned
  })

  it('rejects invalid email format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'invalid-email',
        password: 'password123',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Invalid email format')
  })

  it('rejects request with missing email', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        password: 'password123',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Email and password are required')
  })

  it('rejects request with missing password', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'john@example.com',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Email and password are required')
  })

  it('returns error for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'nonexistent@example.com',
        password: 'password123',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Invalid credentials')
  })

  it('returns error for incorrect password', async () => {
    const mockUser = {
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockResolvedValue(false as never)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'john@example.com',
        password: 'wrongpassword',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Invalid credentials')
  })

  it('handles database errors gracefully', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'john@example.com',
        password: 'password123',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Internal server error')
  })

  it('rejects non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Method not allowed')
  })

  it('rejects request with empty body', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Email and password are required')
  })

  it('trims whitespace from email', async () => {
    const mockUser = {
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: '  john@example.com  ',
        password: 'password123',
      },
    })

    await handler(req, res)

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    })
    
    expect(res._getStatusCode()).toBe(200)
  })

  it('converts email to lowercase', async () => {
    const mockUser = {
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'JOHN@EXAMPLE.COM',
        password: 'password123',
      },
    })

    await handler(req, res)

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    })
  })

  it('rejects passwords shorter than 6 characters', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'john@example.com',
        password: '123',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Password must be at least 6 characters')
  })

  it('handles bcrypt comparison errors', async () => {
    const mockUser = {
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error') as never)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'john@example.com',
        password: 'password123',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
    const data = JSON.parse(res._getData())
    expect(data.error).toBe('Internal server error')
  })

  it('includes proper user data in successful response', async () => {
    const mockUser = {
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashedpassword',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'john@example.com',
        password: 'password123',
      },
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data.user).toEqual({
      id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    })
    expect(data.user.password).toBeUndefined()
  })
})
