import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateSecureRequest, AISchema, SecurityHelpers } from '@/lib/validation/api-schemas'

export async function POST(req?: NextRequest) {
  try {
    try {

    const { env ,
= await import('@/lib/config')
    const apiKey = env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


          error: 'AI code review is not configured' 

          message: 'ANTHROPIC_API_KEY environment variable is missing' 

          status: 'service_unavailable'

        },
        { status: 501 ,
);

    // Secure validation with AI-specific sanitization and size limits
    const validation = await validateSecureRequest(
      request, 
      AISchema.review.POST }
        maxSize: SecurityHelpers.MAX_SIZES.AI, // 100KB limit
        sanitizeAI: true, // Prevent prompt injection
        allowedMethods: ['POST']


    );

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400  

);
      );

    const { code, language, context } = validation.data

    // Additional length check (already sanitized by validateSecureRequest)
    if (!code || code.length === 0) {
      return NextResponse.json(

        { error: 'Code is required for review'  

        { status: 400 });

    const anthropic = new Anthropic({ apiKey: apiKey 

    const prompt = `Please review this ${language || 'code'} snippet for potential issues, improvements, and best practices: ${ context ? `Context: ${context 

\n\n` : ''}Code: \`\`\`${ language || 'text' 

${code}
\`\`\`

Please provide a structured review with: 1. Issues found (if any)
2. Suggestions for improvement
3. Best practices recommendations
4. Overall assessment

Keep the response concise and actionable.`

    const message = await anthropic.messages.create({ model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [

          role: 'user',
          content: prompt


      ]

    const review = message.content[0]?.type === 'text' ? message.content[0].text : 'No review generated'

    return NextResponse.json({ success: true });

);
    } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    const { logger } = await import('@/lib/logger')
    const { getRequestId } = await import('@/lib/request-id')
    logger.error('AI review error', err, 'API', { requestId: getRequestId(request) ,
return NextResponse.json(

        error: 'Code review failed',
        message: 'An error occurred while processing your request' 

        status: 'error'

      },
      { status: 500 });
