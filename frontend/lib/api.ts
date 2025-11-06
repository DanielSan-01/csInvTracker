const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5001';

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Example API functions
export const healthApi = {
  check: () => fetchApi<{ status: string; timestamp: string }>('/api/health'),
};

