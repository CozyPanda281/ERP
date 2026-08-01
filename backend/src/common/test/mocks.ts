type MockQueryResult = { rows: unknown[]; rowCount?: number };

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'from',
  'where',
  'leftJoin',
  'innerJoin',
  'rightJoin',
  'fullJoin',
  'crossJoin',
  'orderBy',
  'limit',
  'offset',
  'groupBy',
  'having',
  'values',
  'set',
  'returning',
  'onConflictDoNothing',
  'onConflictDoUpdate',
  'for',
  'of',
  'with',
  'as',
  'transaction',
];

function isChainMethod(prop: string) {
  return CHAIN_METHODS.includes(prop);
}

function createDrizzleMock(results: unknown[][]) {
  const getResult = () => {
    const r = results.shift();
    return r !== undefined ? r : [];
  };

  const handler: ProxyHandler<() => unknown[]> = {
    get(target, prop: string) {
      if (prop === 'then') {
        const result = getResult();
        return (resolve: Function) => resolve(result);
      }
      if (prop === 'catch' || prop === 'finally') {
        return target[prop as keyof typeof target];
      }
      if (prop === 'transaction') {
        return (callback: (tx: any) => Promise<any>) => {
          const tx = createDrizzleMock(results);
          return callback(tx);
        };
      }
      if (isChainMethod(prop)) {
        return (..._args: unknown[]) => createDrizzleMock(results);
      }
      return (target as any)[prop];
    },
    apply(_target, _thisArg, _args) {
      return createDrizzleMock(results);
    },
  };

  return new Proxy(() => [], handler);
}

export class MockDatabaseProvider {
  private drizzleResults: unknown[][] = [];
  private _db: any;
  private mockResults: Map<string, MockQueryResult> = new Map();

  constructor() {
    this._rebuildDbMock();
  }

  setMockResult(queryPattern: string, result: MockQueryResult) {
    this.mockResults.set(queryPattern, result);
  }

  setDrizzleResults(...results: unknown[][]) {
    this.drizzleResults = [...results];
    this._rebuildDbMock();
  }

  get db() {
    return this._db;
  }

  private _rebuildDbMock() {
    this._db = createDrizzleMock(this.drizzleResults);
  }

  async query(sql: string, params?: unknown[]) {
    for (const [pattern, result] of this.mockResults) {
      if (sql.includes(pattern)) {
        return result;
      }
    }
    return { rows: [], rowCount: 0 };
  }

  getDb() {
    return this;
  }

  getPool() {
    return this;
  }

  async execute() {
    return { rows: [] };
  }

  clearMocks() {
    this.mockResults.clear();
    this.drizzleResults = [];
    this._rebuildDbMock();
  }
}

export const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-access-token'),
  verifyAsync: jest.fn().mockResolvedValue({
    sub: 'user-1',
    sessionId: 'session-1',
    type: 'refresh',
  }),
};

export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, unknown> = {
      'jwt.secret': 'test-secret',
      'jwt.expiresIn': '15m',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiresIn': '7d',
      'jwt.issuer': 'erp-platform',
      'app.port': 3000,
      'app.apiPrefix': 'api/v1',
      'app.corsOrigins': ['http://localhost:5173'],
    };
    return config[key];
  }),
};

export const mockReflector = {
  getAllAndOverride: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
};
