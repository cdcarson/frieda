import { Model } from './model.js';
import type { FetchedSchema, ISchema } from './types.js';

export class Schema implements ISchema {
  #fetchedSchema: FetchedSchema;
  #models: Model[];
  constructor(fetchedSchema: FetchedSchema) {
    this.#fetchedSchema = fetchedSchema;
    this.#models = fetchedSchema.tables.map((t) => new Model(t));
  }

  get databaseName(): string {
    return this.#fetchedSchema.databaseName;
  }

  get models(): Model[] {
    return this.#models;
  }

  toJSON(): ISchema {
    return {
      databaseName: this.databaseName,
      models: this.models
    };
  }
}
