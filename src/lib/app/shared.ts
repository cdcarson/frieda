import type { CastType, MysqlBaseType } from '$lib/index.js';
import type prettier from 'prettier';
import type ts from 'typescript'
export const FRIEDA_RC_FILE_NAME = '.friedarc.json';

export const CURRENT_SCHEMA_SQL_FILE_NAME = 'current-schema.sql';
export const CURRENT_SCHEMA_JSON_FILE_NAME = 'current-schema.json';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;
export const DEFAULT_JSON_FIELD_TYPE = 'unknown';
export const DEFAULT_PRETTIER_OPTIONS: prettier.Options = {
  useTabs: false,
  singleQuote: true,
  trailingComma: 'none',
  semi: true
};

export const TS_COMPILER_OPTIONS = {
  declaration: true
  // isolatedModules: true,
  // preserveValueImports: true,
  // // lib: ['esnext'], // prevents the database.d.ts from being generated
  // moduleResolution: ts.ModuleResolutionKind.NodeNext,
  // module: ts.ModuleKind.CommonJS,
  // target: ts.ScriptTarget.ES5,
  // allowJs: true,
  // checkJs: true,
  // esModuleInterop: true,
  // forceConsistentCasingInFileNames: true,
  // resolveJsonModule: true,
  // skipLibCheck: true,
  // sourceMap: true,
  // strict: true
};

export enum ModelTypeInclusion {
  included = 'included',
  optionalInvisible = 'optionalInvisible'
}
export enum SelectAllTypeInclusion {
  included = 'included',
  omittedInvisible = 'omittedInvisible'
}
export enum CreateTypeInclusion {
  included = 'included',
  omittedGeneratedAlways = 'omittedGeneratedAlways',
  optionalAutoIncrement = 'optionalAutoIncrement',
  optionalHasDefault = 'optionalHasDefault'
}

export enum UpdateTypeInclusion {
  included = 'included',
  omittedGeneratedAlways = 'omittedGeneratedAlways',
  omittedPrimaryKey = 'omittedPrimaryKey'
}

export const ANNOTATIONS = ['bigint', 'set', 'json'] as const;
export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  fullAnnotation: string;
  annotation: Annotation;
  typeArgument?: string;
};

export type FetchTableNamesResult = {
  databaseName: string;
  tableNames: string[];
};

/**
 * A row from `SHOW INDEXES FROM FROM TableName`
 */
export type IndexRow = {
  Table: string;
  Non_unique: number;
  Key_name: string;
  Seq_in_index: number;
  Column_name: string | null;
  Collation: string | null;
  Cardinality: string;
  Sub_part: string | null;
  Packed: string | null;
  Null: string;
  Index_type: string;
  Comment: string;
  Index_comment: string;
  Visible: string;
  Expression: string | null;
};
/**
 * A row from `SHOW CREATE TABLE t`
 */
export type CreateTableRow = {
  Table: string;
  'Create Table': string;
};

/**
 * A row from a `SHOW FULL COLUMNS FROM TableName` query.
 * see https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 */
export type ColumnRow = {
  Field: string;
  Type: string;
  Null: 'YES' | 'NO';
  Collation: string | null;
  Key: string;
  Default: string | null;
  Extra: string;
  Comment: string;
  Privileges: string;
};

export type FetchedSchema = {
  fetched: Date;
  schemaHash: string;
  databaseName: string;
  tables: FetchedTable[];
};

export type FetchedTable = {
  name: string;
  columns: ColumnRow[];
  indexes: IndexRow[];
  createSql: string;
};

export type TypeDeclarationNote = {
  field?: string;
  note: string;
};
export type TypeCodeInfo = {
  typeName: string;
  declaration: string;
  description: string;
  notes: TypeDeclarationNote[];
};

export type ParsedSchema = {
  fetchedSchema: FetchedSchema;
  fetched: Date;
  databaseName: string;
  models: ParsedModel[];
};

export type ParsedModel = {
  readonly table: FetchedTable;
  readonly modelName: string;
  readonly tableName: string;
  readonly selectAllTypeName: string;
  readonly primaryKeyTypeName: string;
  readonly createTypeName: string;
  readonly updateTypeName: string;
  readonly findUniqueTypeName: string;
  readonly dbTypeName: string;
  readonly appDbKey: string;
  readonly fields: ParsedField[];
  readonly indexes: ParsedIndex[];
  readonly modelType: TypeCodeInfo;
  readonly selectAllType: TypeCodeInfo;
  readonly primaryKeyType: TypeCodeInfo;
  readonly createType: TypeCodeInfo;
  readonly updateType: TypeCodeInfo;
  readonly findUniqueType: TypeCodeInfo;
  readonly dbType: TypeCodeInfo;
};

export type ParsedIndex = {
  indexName: string;
  tableName: string;
  indexedColumns: string[];
  isUnique: boolean;
  isFullTextSearch: boolean;
};

export type ParsedField = {
  readonly column: ColumnRow;
  readonly fieldName: string;
  readonly columnName: string;
  readonly isInvisible: boolean;
  readonly mysqlBaseType: MysqlBaseType | null;
  readonly parenthesizedTypeArg: string;
  readonly typeAnnotations: ParsedAnnotation[];
  readonly bigIntAnnotation: ParsedAnnotation | undefined;
  readonly setAnnotation: ParsedAnnotation | undefined;
  readonly jsonAnnotation: Required<ParsedAnnotation> | undefined;
  readonly isTinyIntOne: boolean;
  readonly typeTinyIntAsBoolean: boolean;
  readonly typeBigIntAsBigInt: boolean;
  readonly charLength: number;
  readonly isUnsigned: boolean;
  readonly isPrimaryKey: boolean;
  readonly isAutoIncrement: boolean;
  readonly isUnique: boolean;
  readonly isNullable: boolean;
  readonly hasDefault: boolean;
  readonly defaultValue: string | null | undefined;
  readonly isGeneratedAlways: boolean;
  readonly castType: CastType;
  readonly jsEnumerableStringType: string | undefined;
  readonly precision: number;
  readonly scale: number;
  readonly javascriptType: string;
  readonly modelTypeInclusion: ModelTypeInclusion;
  readonly selectAllTypeInclusion: SelectAllTypeInclusion;
  readonly createTypeInclusion: CreateTypeInclusion;
  readonly updateTypeInclusion: UpdateTypeInclusion;
  readonly modelTypePropertySignature: string;
  readonly selectAllTypePropertySignature: string | undefined;
  readonly createTypePropertySignature: string | undefined;
  readonly updateTypePropertySignature: string | undefined;
};

export type LineNumbers = { [key: string]: number };

export type PathResult = {
  inputPath: string;
  cwd: string;
  absolutePath: string;
  relativePath: string;
  dirname: string;
  basename: string;
  extname: string;
  isUnderCwd: boolean;
};

export type FileResult = PathResult & {
  exists: boolean;
  isFile: boolean;
  contents?: string;
};

export type DirectoryResult = PathResult & {
  exists: boolean;
  isDirectory: boolean;
  isEmpty: boolean;
};





export const CURRENT_SCHEMA_FILE_NAMES = [
  'current-schema.sql',
  'current-schema.json'
] as const;

export type CurrentSchemaFilesResult = {
  files: {[K in  typeof CURRENT_SCHEMA_FILE_NAMES[number]]: FileResult};
  valid: boolean;
  schemaSql: string;
  fetchedSchema: FetchedSchema|undefined
}

export const CODE_FILE_BASENAMES = [
  'types.d',
  'database',
  'schema',
  'search-indexes'
] as const;

export type CodeFiles = {
  files: {[K in typeof CODE_FILE_BASENAMES[number]]: FileResult[]};
  valid: boolean
}







export type SchemaChange = {
  previousSchema: FetchedSchema;
  changeSql: string;
};

export type AppOptions = {
  projectAbsolutePath: string;
  databaseUrl: string;
  outputDirectory: string;
  schemaDirectory: string;
  compileJs: boolean;
};

export type DatabaseDetails = {
  databaseUrl: string;
  databaseUrlKey: string;
  envFile: string;
};

export type WebData = {
  options: AppOptions;
  fetchedSchema: FetchedSchema;
  schema: ParsedSchema;
  codeFiles: CodeFiles;
  schemaFiles: CurrentSchemaFilesResult;
  changeFiles?: FileResult[];
  modelTypes: ModelTypeData[]
}

export type ChangeRequest = {
  sql: string;
};

export type ChangeError = {
  sql: string;
  error: string;
};

export type ModelTypeData = {
  name: string;
  pos: ts.LineAndCharacter;
  text: string;
  fullText: string

}
