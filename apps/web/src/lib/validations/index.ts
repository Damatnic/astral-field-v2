/**
 * Validation Utilities
 * Common validation functions for forms and data processing
 */

import { z } from 'zod'

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation
export function validatePassword(password: string): boolean {
  return password.length >= 8
}

// Input sanitization
export function sanitizeInput(input: string): string {
  // Remove script tags and potentially harmful content
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

// User registration schema
export const userRegistrationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  teamName: z.string().max(100).optional()
})

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required')
})

// Team name validation
export function validateTeamName(teamName: string): boolean {
  return teamName.length > 0 && teamName.length <= 100
}

// Player search validation
export function validatePlayerSearch(query: string): boolean {
  return query.trim().length >= 2
}

export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type LoginCredentials = z.infer<typeof loginSchema>