"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCurrentMigration = exports.executeMigration = exports.runCurrentMigration = void 0;
var prompts_1 = require("@clack/prompts");
var fs_extra_1 = require("fs-extra");
var utils_js_1 = require("./utils.js");
var utils_js_2 = require("./utils.js");
var schema_js_1 = require("./schema.js");
var path_1 = require("path");
var constants_js_1 = require("./constants.js");
var runCurrentMigration = function (settings, connection) { return __awaiter(void 0, void 0, void 0, function () {
    var sql, beforeSchema, afterSchema, s, d, migrationDir, schemaBeforeFilePath, schemaAfterFilePath, migrationFilePath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.readCurrentMigration)(settings.currentMigrationFullPath)];
            case 1:
                sql = _a.sent();
                if (sql.length === 0) {
                    return [2 /*return*/, (0, utils_js_2.cancelAndExit)()];
                }
                return [4 /*yield*/, (0, schema_js_1.fetchSchema)(connection)];
            case 2:
                beforeSchema = _a.sent();
                return [4 /*yield*/, (0, exports.executeMigration)(settings.databaseUrl, sql)];
            case 3:
                _a.sent();
                return [4 /*yield*/, (0, schema_js_1.fetchSchema)(connection)];
            case 4:
                afterSchema = _a.sent();
                s = (0, utils_js_1.createSpinner)('Saving migration');
                d = new Date();
                migrationDir = (0, path_1.join)(settings.schemaDirectoryFullPath, constants_js_1.MIGRATION_HISTORY_FOLDER, d.toISOString());
                schemaBeforeFilePath = (0, path_1.join)(migrationDir, "schema-before.sql");
                schemaAfterFilePath = (0, path_1.join)(migrationDir, "schema-after.sql");
                migrationFilePath = (0, path_1.join)(migrationDir, "migration.sql");
                return [4 /*yield*/, (0, fs_extra_1.ensureDir)(migrationDir)];
            case 5:
                _a.sent();
                return [4 /*yield*/, Promise.all([
                        fs_extra_1.default.writeFile(schemaBeforeFilePath, (0, schema_js_1.getSchemaSql)(beforeSchema)),
                        fs_extra_1.default.writeFile(migrationFilePath, "-- Migration completed: ".concat(d.toUTCString(), "\n\n").concat(sql)),
                        fs_extra_1.default.writeFile(schemaAfterFilePath, (0, schema_js_1.getSchemaSql)(afterSchema)),
                        fs_extra_1.default.writeFile(settings.currentSchemaFullPath, (0, schema_js_1.getSchemaSql)(afterSchema)),
                        fs_extra_1.default.writeFile(settings.currentMigrationFullPath, '')
                    ])];
            case 6:
                _a.sent();
                s.done();
                prompts_1.log.info([
                    (0, utils_js_1.formatFilePath)(migrationDir),
                    ' - ' + (0, utils_js_1.formatFilePath)(schemaBeforeFilePath),
                    ' - ' + (0, utils_js_1.formatFilePath)(migrationFilePath),
                    ' - ' + (0, utils_js_1.formatFilePath)(schemaAfterFilePath),
                    "".concat((0, utils_js_1.formatFilePath)(settings.currentSchemaFullPath), " updated."),
                    "".concat((0, utils_js_1.formatFilePath)(settings.currentMigrationFullPath), " is now empty."),
                ].join('\n'));
                return [2 /*return*/, afterSchema];
        }
    });
}); };
exports.runCurrentMigration = runCurrentMigration;
var executeMigration = function (databaseUrl, sql) { return __awaiter(void 0, void 0, void 0, function () {
    var s, connection, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                s = (0, utils_js_1.createSpinner)("Executing migration");
                return [4 /*yield*/, (0, utils_js_1.getMysql2Connection)(databaseUrl)];
            case 1:
                connection = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 7]);
                return [4 /*yield*/, connection.execute(sql)];
            case 3:
                _a.sent();
                return [4 /*yield*/, connection.end()];
            case 4:
                _a.sent();
                s.done();
                return [3 /*break*/, 7];
            case 5:
                error_1 = _a.sent();
                return [4 /*yield*/, connection.end()];
            case 6:
                _a.sent();
                s.error();
                throw error_1;
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.executeMigration = executeMigration;
var readCurrentMigration = function (currentMigrationFullPath) { return __awaiter(void 0, void 0, void 0, function () {
    var s, sql;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                s = (0, utils_js_1.createSpinner)('Reading current migration');
                return [4 /*yield*/, fs_extra_1.default.ensureFile(currentMigrationFullPath)];
            case 1:
                _a.sent();
                return [4 /*yield*/, fs_extra_1.default.readFile(currentMigrationFullPath, 'utf-8')];
            case 2:
                sql = _a.sent();
                s.done();
                return [2 /*return*/, sql.trim()];
        }
    });
}); };
exports.readCurrentMigration = readCurrentMigration;
