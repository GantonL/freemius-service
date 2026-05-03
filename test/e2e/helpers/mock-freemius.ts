const originalFetch = globalThis.fetch;

export type MockHandler = (request: Request) => Promise<Response> | Response;

interface MockEntry {
  pattern: RegExp | string;
  handler: MockHandler;
}

export function createMockFreemius() {
  let mocks: MockEntry[] = [];

  return {
    setup() {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : input instanceof URL ? input.toString() : String(input);

        if (url.includes("localhost") || url.includes("127.0.0.1")) {
          return originalFetch(input, init);
        }

        if (url.includes("api.freemius.com")) {
          for (const { pattern, handler } of mocks) {
            const matched = typeof pattern === "string" ? url.includes(pattern) : pattern.test(url);
            if (matched) return handler(new Request(input, init));
          }
          console.warn(`[Mock] Unhandled request to ${url}`);
          return new Response(JSON.stringify({ error: { message: "Unhandled mock" } }), { status: 404 });
        }

        return originalFetch(input, init);
      };
    },

    teardown() {
      globalThis.fetch = originalFetch;
      mocks = [];
    },

    addMock(pattern: RegExp | string, handler: MockHandler) {
      mocks.push({ pattern, handler });
    },

    clearMocks() {
      mocks = [];
    },
  };
}
