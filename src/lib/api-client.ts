/**
 * 統一HTTPクライアント
 * リトライロジック、タイムアウト、エラーハンドリングに対応
 */

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  backoffMs?: number;
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

const DEFAULT_TIMEOUT = 10000; // 10秒
const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF = 1000; // 1秒

class HttpClient {
  private baseUrl?: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      backoffMs = DEFAULT_BACKOFF,
      ...fetchOptions
    } = options;

    const fullUrl = this.baseUrl ? `${this.baseUrl}${url}` : url;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = (await response.json()) as T;

        return {
          data,
          status: response.status,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          const delayMs = backoffMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(
      `Request failed after ${retries + 1} attempts: ${lastError?.message}`
    );
  }

  get<T>(url: string, options?: RequestOptions) {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  post<T>(url: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  }

  /**
   * APIキー認証ヘッダーを追加したリクエスト
   */
  async authenticatedRequest<T>(
    url: string,
    apiKey: string,
    headerName: string = "Authorization",
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      headers: {
        [headerName]: `Bearer ${apiKey}`,
        ...options.headers,
      },
    });
  }
}

// シングルトンインスタンス
export const httpClient = new HttpClient();

// ベースURLを指定したインスタンスを作成するファクトリ
export function createHttpClient(baseUrl: string) {
  return new HttpClient(baseUrl);
}

export type { RequestOptions, ApiResponse };
