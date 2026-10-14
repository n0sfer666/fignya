export const hasErrorCode = (error: unknown, code: string): boolean => error instanceof Error && "code" in error && error.code === code;
