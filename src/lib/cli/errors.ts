import { PATH_TO_CERT } from './constants.js';
import type { RcSettings } from './types.js';
export class CliError extends Error {}

export class CancelledByUserError extends CliError {
  constructor() {
    super('Operation cancelled');
  }
}

export class Mysql2CertificateReadError extends CliError {
  constructor() {
    super(`The certificate at ${PATH_TO_CERT} could not be read.`);
  }
}

export class Mysql2ConnectionError extends CliError {
  constructor(cause: unknown) {
    super('Could not create a connection to the database using mysql2.', {
      cause
    });
  }
}

export class Mysql2QueryError extends CliError {
  constructor(cause: unknown) {
    super('Query failed.', { cause });
  }
}

export class ServerlessQueryError extends CliError {
  constructor(cause: unknown) {
    super('Query failed.', { cause });
  }
}

export class RcNotFoundError extends CliError {
  constructor(message: string) {
    super(message);
  }
}

export class RcSettingsError extends Error {
  constructor(public readonly key: keyof RcSettings, message: string) {
    super(message);
  }
}
