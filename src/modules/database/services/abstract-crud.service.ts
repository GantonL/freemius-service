import { type SQL } from "drizzle-orm";
import { type PgTable } from "drizzle-orm/pg-core";
import { ClientProvider } from "../client.provider.ts";

export abstract class AbstractCrudService<T extends PgTable> {
  protected readonly db: any;

  constructor(
    protected readonly clientProvider: ClientProvider,
    protected readonly table: T,
  ) {
    this.db = clientProvider.client;
  }

  /**
   * Child classes must implement this to provide base filters (e.g., user isolation).
   */
  protected abstract getFilters(filters?: SQL): SQL | undefined;

  /**
   * Create a new record.
   */
  async create(data: T["$inferInsert"]): Promise<T["$inferSelect"]> {
    const [result] = await this.db
      .insert(this.table)
      .values(data)
      .returning();
    return result;
  }

  /**
   * Find a single record based on filters.
   */
  async findOne(filters?: SQL): Promise<T["$inferSelect"] | null> {
    const finalFilters = this.getFilters(filters);
    const query = this.db.select().from(this.table);
    
    if (finalFilters) {
      query.where(finalFilters);
    }
    
    const [result] = await query.limit(1);
    return result || null;
  }

  /**
   * Find all records based on filters.
   */
  async findAll(filters?: SQL): Promise<T["$inferSelect"][]> {
    const finalFilters = this.getFilters(filters);
    const query = this.db.select().from(this.table);
    
    if (finalFilters) {
      query.where(finalFilters);
    }
    
    return await query;
  }

  async update(data: Partial<T["$inferInsert"]>, filters?: SQL): Promise<T["$inferSelect"] | null> {
    const finalFilters = this.getFilters(filters);
    const query = this.db.update(this.table).set(data);
    
    if (finalFilters) {
      query.where(finalFilters);
    }
    
    const [result] = await query.returning();
    return result || null;
  }

  /**
   * Delete records based on filters.
   */
  async delete(filters?: SQL): Promise<boolean> {
    const finalFilters = this.getFilters(filters);
    const query = this.db.delete(this.table);
    
    if (finalFilters) {
      query.where(finalFilters);
    }
    
    const result = await query.returning();
    return result.length > 0;
  }
}
