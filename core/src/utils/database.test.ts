/**
 * Tests for Database Abstraction Layer and PostgreSQL Support
 */

import { 
  DatabaseConnectionManager, 
  createDatabaseConfig, 
  createKyselyInstance, 
  testDatabaseConnection 
} from './database.js';
import { sql } from 'kysely';

// Test interface for database operations
interface TestDatabase {
  test_table: {
    id: string;
    name: string;
    value: number;
    created_at: string;
  };
}

describe('Database Abstraction Layer', () => {
  describe('Configuration', () => {
    it('should create default PostgreSQL configuration', () => {
      const config = createDatabaseConfig();
      
      expect(config).toMatchObject({
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        poolSize: 10,
        ssl: false,
        connectionTimeout: 30000,
        idleTimeout: 30000,
        maxRetries: 3
      });
    });

    it('should create custom PostgreSQL configuration', () => {
      const config = createDatabaseConfig({
        host: 'db.example.com',
        port: 5433,
        database: 'myapp',
        user: 'admin',
        password: 'secret',
        poolSize: 20,
        ssl: true
      });
      
      expect(config).toMatchObject({
        type: 'postgresql',
        host: 'db.example.com',
        port: 5433,
        database: 'myapp',
        user: 'admin',
        password: 'secret',
        poolSize: 20,
        ssl: true
      });
    });

    it('should merge custom options with defaults', () => {
      const config = createDatabaseConfig({
        database: 'testdb',
        poolSize: 15
      });
      
      expect(config).toMatchObject({
        type: 'postgresql',
        database: 'testdb',
        poolSize: 15,
        host: 'localhost', // default
        port: 5432, // default
        ssl: false // default
      });
    });
  });

  describe('Kysely Instance Creation', () => {
    it('should create PostgreSQL instance', () => {
      const config = createDatabaseConfig({
        database: 'test_db'
      });
      
      const db = createKyselyInstance<TestDatabase>(config);
      expect(db).toBeDefined();
    });

    it('should throw error for unsupported database type', () => {
      const config = createDatabaseConfig();
      // Force an invalid type
      (config as any).type = 'unsupported';
      
      expect(() => createKyselyInstance<TestDatabase>(config))
        .toThrow('Only PostgreSQL is supported. Received: unsupported');
    });
  });

  describe('PostgreSQL Configuration Tests', () => {
    it('should create PostgreSQL configuration without connecting', () => {
      const config = createDatabaseConfig({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_pass',
        poolSize: 5,
        ssl: true
      });

      expect(config.type).toBe('postgresql');
      expect(config.poolSize).toBe(5);
      expect(config.ssl).toBe(true);
      
      // Should not throw when creating instance (though connection would fail without actual DB)
      expect(() => {
        const db = createKyselyInstance<TestDatabase>(config);
        // Don't attempt to connect, just test instance creation
        expect(db).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Database Utility Methods', () => {
    it('should handle timestamp generation consistently', () => {
      const manager = new DatabaseConnectionManager<TestDatabase>(
        createDatabaseConfig({ 
          database: 'test' // Won't connect, just testing method
        })
      );
      
      const timestamp = manager.getCurrentTimestamp();
      
      // Should return ISO string
      expect(typeof timestamp).toBe('string');
      expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should handle JSON operations consistently', () => {
      const manager = new DatabaseConnectionManager<TestDatabase>(
        createDatabaseConfig({ 
          database: 'test'
        })
      );
      
      const testData = { key: 'value', number: 42, array: [1, 2, 3] };
      
      const json = manager.createJsonColumn(testData);
      expect(json).toBe('{"key":"value","number":42,"array":[1,2,3]}');
      
      const parsed = manager.parseJsonColumn(json);
      expect(parsed).toEqual(testData);
    });

    it('should handle JSON parsing errors gracefully', () => {
      const manager = new DatabaseConnectionManager<TestDatabase>(
        createDatabaseConfig({ database: 'test' })
      );
      
      const invalidJson = 'invalid-json';
      const result = manager.parseJsonColumn(invalidJson);
      expect(result).toBe(invalidJson);
    });

    it('should return correct dialect type', () => {
      const manager = new DatabaseConnectionManager<TestDatabase>(
        createDatabaseConfig({ database: 'test' })
      );
      
      expect(manager.getDialectType()).toBe('postgresql');
    });
  });

  // Note: These tests require a running PostgreSQL instance
  // Use environment variable TEST_DATABASE_URL to enable integration tests
  describe('PostgreSQL Integration Tests', () => {
    const shouldRunIntegrationTests = process.env.TEST_DATABASE_URL && process.env.NODE_ENV === 'test';
    
    if (!shouldRunIntegrationTests) {
      it.skip('Integration tests skipped - set TEST_DATABASE_URL to enable', () => {});
      return;
    }

    let manager: DatabaseConnectionManager<TestDatabase>;

    beforeEach(async () => {
      const config = createDatabaseConfig({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'test',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      });
      
      manager = new DatabaseConnectionManager<TestDatabase>(config);
      await manager.initialize();
      
      // Create test table
      await manager.kysely.schema
        .createTable('test_table')
        .ifNotExists()
        .addColumn('id', 'text', col => col.primaryKey())
        .addColumn('name', 'text', col => col.notNull())
        .addColumn('value', 'integer', col => col.notNull())
        .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .execute();
    });

    afterEach(async () => {
      try {
        // Clean up test table
        await manager.kysely.schema.dropTable('test_table').ifExists().execute();
      } catch (error) {
        console.warn('Failed to clean up test table:', error);
      }
      await manager.close();
    });

    it('should establish PostgreSQL connection', async () => {
      const healthCheck = await manager.healthCheck();
      
      expect(healthCheck.isHealthy).toBe(true);
      expect(healthCheck.latency).toBeGreaterThanOrEqual(0);
      expect(healthCheck.timestamp).toBeDefined();
    });

    it('should perform basic CRUD operations', async () => {
      const db = manager.kysely;
      
      // Insert
      await db.insertInto('test_table')
        .values({
          id: 'test-1',
          name: 'Test Item',
          value: 42,
          created_at: manager.getCurrentTimestamp()
        })
        .execute();
      
      // Read
      const items = await db.selectFrom('test_table').selectAll().execute();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'test-1',
        name: 'Test Item',
        value: 42
      });
      
      // Update
      await db.updateTable('test_table')
        .set({ value: 84 })
        .where('id', '=', 'test-1')
        .execute();
      
      const updatedItem = await db.selectFrom('test_table')
        .selectAll()
        .where('id', '=', 'test-1')
        .executeTakeFirst();
      
      expect(updatedItem?.value).toBe(84);
      
      // Delete
      await db.deleteFrom('test_table')
        .where('id', '=', 'test-1')
        .execute();
      
      const remainingItems = await db.selectFrom('test_table').selectAll().execute();
      expect(remainingItems).toHaveLength(0);
    });

    it('should handle transactions', async () => {
      const db = manager.kysely;
      
      await db.transaction().execute(async (trx) => {
        await trx.insertInto('test_table')
          .values({
            id: 'test-1',
            name: 'Test Item 1',
            value: 1,
            created_at: manager.getCurrentTimestamp()
          })
          .execute();
        
        await trx.insertInto('test_table')
          .values({
            id: 'test-2',
            name: 'Test Item 2',
            value: 2,
            created_at: manager.getCurrentTimestamp()
          })
          .execute();
      });
      
      const items = await db.selectFrom('test_table').selectAll().execute();
      expect(items).toHaveLength(2);
    });
  });
});