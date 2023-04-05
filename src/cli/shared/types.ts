export type CommandId = 'migrate' | 'fetch' | 'generate' | 'init' | 'help';
export type Command = { id: CommandId; description: string };

export type RcSettings = {
  schemaDirectory: string;
  generatedCodeDirectory: string;
  alwaysGenerateCode?: boolean;
  externalTypeImports?: string[];
  databaseUrlEnvFile?: string;
  databaseUrlAlwaysAsk?: boolean;
};
export type RcSettingsDbUrl = Pick<RcSettings, 'databaseUrlEnvFile'|'databaseUrlAlwaysAsk'>




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

export type RawSchema = {
  fetched: Date;
  databaseName: string;
  tableNames: string[];
  tables: RawTableInfo[];
};

export type GeneratedCode = {
  constants: string;
  database: string;
  models: string;
}

export type ResolvedFriedaVars = {
  generatedModelsDirectoryFullPath: string;
  migrationsDirectoryFullPath: string;
  externalTypeImports: string[];
  databaseUrl: string;
};
