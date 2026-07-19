import { createSuccessResponse, handleUnknownError } from '@repo/core/response';

export async function GET() {
  try {
    return Response.json(
      createSuccessResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
