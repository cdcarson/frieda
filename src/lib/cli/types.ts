import type { FieldTypeSettings } from "$lib/types.js";

export type RcSettings = FieldTypeSettings & {
  schemaDirectory: string;
  generatedCodeDirectory: string;
  externalTypeImports?: string[];
  envFilePath?: string;
}
export type FullSettings = RcSettings & {
  databaseUrl: string;
}

export type ReadFriedaRcResult = {
  settings: Partial<RcSettings>;
  exists: boolean;
  fullPath: string;
};

