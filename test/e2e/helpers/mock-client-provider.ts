const TEST_USER = { id: 1, email: "test@example.com", name: "Test User" };

function makeChain(result: unknown[] = []): any {
  const obj: any = {
    from: () => obj,
    where: () => obj,
    set: () => obj,
    values: () => obj,
    limit: () => Promise.resolve(result),
    returning: () => Promise.resolve(result),
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  return obj;
}

export class MockClientProvider {
  public readonly client = {
    select: () => makeChain([TEST_USER]),
    insert: () => makeChain([{ id: 1 }]),
    update: () => makeChain([{ id: 1 }]),
    delete: () => makeChain([{ id: 1 }]),
  };

  async onAppBootstrap() {}
  async onAppClose() {}
}
