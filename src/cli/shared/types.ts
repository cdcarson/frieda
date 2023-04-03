export type CommandId = 'migrate'| 'introspect' | 'generate' | 'help'
export type Command = { id: CommandId, description: string}

export type FriedaRcVars = {
  migrationsDirectory?: string;
  generatedModelsDirectory?: string;
  externalTypeImports?: string[];
};

export type FriedaVars = FriedaRcVars & {
  databaseUrl?: string;
};

export type RawTableColumnInfo = {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: string;
  Extra: string;
  Comment: string;
};

export type RawTableIndexInfo = {
  Table: string;
  Non_unique: string;
  Key_name: string;
  Seq_in_index: string;
  Column_name: string;
  Collation: string;
  Cardinality: string;
  Sub_part: string;
  Packed: string;
  Null: string;
  Index_type: string;
  Comment: string;
  Index_comment: string;
  Visible: string;
  Expression: string;
};
export type RawTableInfo = {
  name: string;
  columns: RawTableColumnInfo[];
  indexes: RawTableIndexInfo[];
  tableCreateStatement: string;
};

export type GeneratedCode = {
  searchIndices: string;
  schemaCast: string;
  models: string;
  database: string;
}