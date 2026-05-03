const originalFetch = globalThis.fetch;

export type MockHandler = (request: Request) => Promise<Response> | Response;

let currentMocks: { pattern: RegExp | string; handler: MockHandler }[] = [];

export const mockFreemius = {
  setup: () => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input instanceof URL ? input.toString() : input;
      
      // Pass through calls to localhost (our test server)
      if (url.includes("localhost") || url.includes("127.0.0.1")) {
        return originalFetch(input, init);
      }

      // Intercept calls to Freemius API
      if (url.includes("api.freemius.com")) {
        for (const mock of currentMocks) {
          if (typeof mock.pattern === "string" ? url.includes(mock.pattern) : mock.pattern.test(url)) {
            const req = new Request(input, init);
            return mock.handler(req);
          }
        }
        // Unhandled mock
        console.warn(`[Mock] Unhandled request to ${url}`);
        return new Response(JSON.stringify({ error: { message: "Unhandled mock" } }), { status: 404 });
      }

      return originalFetch(input, init);
    };
  },
  
  teardown: () => {
    globalThis.fetch = originalFetch;
    currentMocks = [];
  },

  addMock: (pattern: RegExp | string, handler: MockHandler) => {
    currentMocks.push({ pattern, handler });
  },

  clearMocks: () => {
    currentMocks = [];
  }
};
