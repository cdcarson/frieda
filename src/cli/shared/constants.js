"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORMATTED_DB_URL_EXAMPLE = exports.ENV_DB_URL_KEYS = exports.VERSION = exports.MIGRATION_HISTORY_FOLDER = exports.CURRENT_SCHEMA_FILE_NAME = exports.CURRENT_MIGRATION_FILE_NAME = exports.RC_FILE_NAME = void 0;
var picocolors_1 = require("picocolors");
exports.RC_FILE_NAME = '.friedarc';
exports.CURRENT_MIGRATION_FILE_NAME = 'current-migration.sql';
exports.CURRENT_SCHEMA_FILE_NAME = 'current-schema.sql';
exports.MIGRATION_HISTORY_FOLDER = 'history';
exports.VERSION = '0.0.4';
exports.ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'];
exports.FORMATTED_DB_URL_EXAMPLE = picocolors_1.default.gray('mysql://') +
    picocolors_1.default.magenta('<user>') +
    picocolors_1.default.gray(':') +
    picocolors_1.default.magenta('<password>') +
    picocolors_1.default.gray('@') +
    picocolors_1.default.magenta('<host>');
