// Common utilities used across the monorepo
export const formatTimestamp = (date: Date = new Date()): string => {
  return date.toISOString();
};

export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string
) => ({
  success,
  data,
  error,
  timestamp: formatTimestamp(),
});
