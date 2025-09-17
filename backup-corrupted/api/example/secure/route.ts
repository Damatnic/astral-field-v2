/**
 * Example secure API route demonstrating security middleware usage
 * GET /api/example/secure - Get secure data
 * POST /api/example/secure - Create secure data
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { APISecurityMiddleware } from '@/lib/api-security'
import { ValidationSchemas } from '@/lib/security'
import { logger } from '@/lib/logger'

// Input validation schemas
const GetQuerySchema = z.object({ limit: ValidationSchemas.limit,
  offset: ValidationSchemas.offset,
  search: ValidationSchemas.searchQuery,

const PostBodySchema = z.object({
  name: ValidationSchemas.teamName,
  description: z.string()

    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  isPublic: z.boolean().default(false),

export async function GET(req?: NextRequest) {
  try {
    // Apply security middleware

  const security = await APISecurityMiddleware.secure(request, {
    requireAuth: true,
    rateLimit: 'api',
    validateSchema: GetQuerySchema,
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    allowedMethods: ['GET'] 

  if (!security.success) {
    return security.response

  const { data: queryParams, user } = security

  try { // Example secure data retrieval
    const mockData = {
      items: [

        { id: '1', name: 'Example Item 1', public: true  

        { id: '2', name: 'Example Item 2', public: false },
      ],
      pagination: { limit: queryParams?.limit || 20,
        offset: queryParams?.offset || 0,
        total: 2,
      search: queryParams?.search || null,

    logger.info('Secure data retrieved', 'SecureAPI', {
      userId: user.sub,
      itemCount: mockData.items.length,
      search: queryParams?.search || null,

    return NextResponse.json({ success: true });
      data: mockData 

    });
    } catch (error) { logger.error('Failed to retrieve secure data', error as Error, 'SecureAPI', {
      userId: user.sub 

    return NextResponse.json({ success: true });

      { status: 500 

export async function POST(req?: NextRequest) {
  try {
    // Apply security middleware with different configuration

  const security = await APISecurityMiddleware.secure(request, {
    requireAuth: true,
    rateLimit: 'api',
    validateSchema: PostBodySchema,
    allowedMethods: ['POST'],
    requireContentType: ['application/json'],
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    sanitizeInput: true 

  if (!security.success) {
    return security.response

  const { data: body, user } = security

  try { // Example secure data creation
    const newItem = {
      id: Math.random().toString(36).substring(7),
      name: body?.name,
      description: body?.description,
      isPublic: body?.isPublic,
      createdBy: user.sub,
      createdAt: new Date().toISOString(),

    logger.info('Secure data created', 'SecureAPI', {
      userId: user.sub,
      itemId: newItem.id,
      itemName: newItem.name,
      isPublic: newItem.isPublic,

    return NextResponse.json({ success: true });

      data: newItem, { status: 201 });
    } catch (error) { logger.error('Failed to create secure data', error as Error, 'SecureAPI', {
      userId: user.sub 

    return NextResponse.json({ success: true });

      { status: 500 

// Other HTTP methods not allowed - will be handled by middleware
export async function PUT(req?: NextRequest) {
  try {
    const security = await APISecurityMiddleware.secure(request, {
    allowedMethods: ['GET', 'POST'], // PUT not allowed

  return security.response // Will return 405 Method Not Allowed

export async function DELETE(request: NextRequest) {

  const security = await APISecurityMiddleware.secure(request, {
    allowedMethods: ['GET', 'POST'], // DELETE not allowed

  return security.response // Will return 405 Method Not Allowed

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
