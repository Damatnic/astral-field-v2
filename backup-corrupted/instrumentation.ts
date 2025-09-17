import * as Sentry from '@sentry/nextjs';

export async function register(req?: NextRequest) {
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');


export const onRequestError = Sentry.captureRequestError;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
