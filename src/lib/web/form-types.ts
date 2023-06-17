import type { MysqlBaseType } from "$lib/index.js";

export type FormErrors<T extends Record<string,unknown>> = {
  [K in keyof T]?: string
}
export type FormTouched<T extends Record<string,unknown>> = {
  [K in keyof T]?: boolean;
}

export type ColumnDefinitionData = {
  columnDefinition: string;
  valid: boolean
}

