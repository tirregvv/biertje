export class HttpError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export function toH3Error(err: unknown) {
  if (err instanceof HttpError) {
    return createError({ statusCode: err.statusCode, statusMessage: err.message })
  }
  if (err && typeof err === 'object' && 'statusCode' in err) {
    return err as ReturnType<typeof createError>
  }
  console.error(err)
  return createError({ statusCode: 500, statusMessage: 'Internal server error' })
}
