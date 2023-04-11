"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripTrailingSlash = exports.promptValidateFilePath = exports.isValidFilePathInCwd = exports.isValidDatabaseURL = exports.getSettings = void 0;
var path_1 = require("path");
var dotenv_1 = require("dotenv");
var constants_js_1 = require("./constants.js");
var fs_extra_1 = require("fs-extra");
var prompts_1 = require("@clack/prompts");
var utils_js_1 = require("./utils.js");
var picocolors_1 = require("picocolors");
var getSettings = function () { return __awaiter(void 0, void 0, void 0, function () {
    var rcSettings, dbResult, databaseUrl, schemaResult, schemaDirectoryFullPath, codeResult, generatedCodeDirectoryFullPath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, readRcSettings()];
            case 1:
                rcSettings = _a.sent();
                return [4 /*yield*/, getDatabaseUrl(rcSettings)];
            case 2:
                dbResult = _a.sent();
                rcSettings = dbResult.rcSettings;
                databaseUrl = dbResult.databaseUrl;
                return [4 /*yield*/, getSchemaDirectoryFullPath(rcSettings)];
            case 3:
                schemaResult = _a.sent();
                rcSettings = schemaResult.rcSettings;
                schemaDirectoryFullPath = schemaResult.schemaDirectoryFullPath;
                return [4 /*yield*/, getGeneratedCodeDirectoryFullPath(rcSettings)];
            case 4:
                codeResult = _a.sent();
                rcSettings = codeResult.rcSettings;
                generatedCodeDirectoryFullPath = codeResult.generatedCodeDirectoryFullPath;
                prompts_1.log.success([
                    picocolors_1.default.bold('Database URL:'),
                    maskDatabaseURLPassword(databaseUrl),
                    picocolors_1.default.dim("Source: ".concat(picocolors_1.default.cyan(dbResult.sourceFile), " ").concat(picocolors_1.default.magenta(dbResult.sourceKey))),
                    "".concat(picocolors_1.default.bold('Schema directory:'), " ").concat((0, utils_js_1.formatFilePath)(schemaDirectoryFullPath)),
                    "".concat(picocolors_1.default.bold('Generated code directory:'), " ").concat((0, utils_js_1.formatFilePath)(generatedCodeDirectoryFullPath)),
                ].join('\n'));
                return [2 /*return*/, __assign(__assign({}, rcSettings), { databaseUrl: databaseUrl, generatedCodeDirectoryFullPath: generatedCodeDirectoryFullPath, schemaDirectoryFullPath: schemaDirectoryFullPath, currentMigrationFullPath: (0, path_1.join)(schemaDirectoryFullPath, constants_js_1.CURRENT_MIGRATION_FILE_NAME), currentSchemaFullPath: (0, path_1.join)(schemaDirectoryFullPath, constants_js_1.CURRENT_SCHEMA_FILE_NAME) })];
        }
    });
}); };
exports.getSettings = getSettings;
var readRcSettings = function () { return __awaiter(void 0, void 0, void 0, function () {
    var s, rcPath, exists, rawSettings, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                s = (0, prompts_1.spinner)();
                rcPath = getRcFilePath();
                s.start("Reading ".concat((0, utils_js_1.formatFilePath)(rcPath), "..."));
                return [4 /*yield*/, fs_extra_1.default.exists(rcPath)];
            case 1:
                exists = _a.sent();
                rawSettings = {};
                if (!exists) return [3 /*break*/, 5];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, fs_extra_1.default.readJSON(rcPath)];
            case 3:
                rawSettings = _a.sent();
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                rawSettings = {};
                return [3 /*break*/, 5];
            case 5:
                s.stop("Reading ".concat((0, utils_js_1.formatFilePath)(rcPath), "... done."));
                return [2 /*return*/, rawSettings];
        }
    });
}); };
var writeRcSettings = function (update) { return __awaiter(void 0, void 0, void 0, function () {
    var s, rcPath, exists, rawSettings, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                s = (0, prompts_1.spinner)();
                rcPath = getRcFilePath();
                s.start("Saving ".concat((0, utils_js_1.formatFilePath)(rcPath), "..."));
                return [4 /*yield*/, fs_extra_1.default.exists(rcPath)];
            case 1:
                exists = _a.sent();
                rawSettings = {};
                if (!exists) return [3 /*break*/, 5];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, fs_extra_1.default.readJSON(rcPath)];
            case 3:
                rawSettings = _a.sent();
                return [3 /*break*/, 5];
            case 4:
                error_2 = _a.sent();
                rawSettings = {};
                return [3 /*break*/, 5];
            case 5:
                rawSettings = __assign(__assign({}, rawSettings), update);
                return [4 /*yield*/, fs_extra_1.default.writeJSON(rcPath, rawSettings, { spaces: 1 })];
            case 6:
                _a.sent();
                s.stop("Saving ".concat((0, utils_js_1.formatFilePath)(rcPath), "... done."));
                return [2 /*return*/, rawSettings];
        }
    });
}); };
var getRcFilePath = function () {
    return (0, path_1.join)(process.cwd(), constants_js_1.RC_FILE_NAME);
};
var isValidDatabaseURL = function (url) {
    if (typeof url !== 'string') {
        return false;
    }
    try {
        new URL(url);
        return true;
    }
    catch (error) {
        return false;
    }
};
exports.isValidDatabaseURL = isValidDatabaseURL;
var maskDatabaseURLPassword = function (urlStr) {
    var url = new URL(urlStr);
    var protocol = url.protocol;
    url.protocol = 'http:';
    var username = url.username, hostname = url.hostname;
    url.password = '<PASSWORD>';
    return (picocolors_1.default.cyan(protocol + '//' + username + ':') +
        picocolors_1.default.dim('<password>') +
        picocolors_1.default.cyan('@' + hostname));
};
var isValidFilePathInCwd = function (value) {
    if (typeof value !== 'string') {
        return false;
    }
    var fp = (0, exports.stripTrailingSlash)((0, path_1.join)(process.cwd(), value.trim()));
    return fp.startsWith(process.cwd()) && fp !== process.cwd();
};
exports.isValidFilePathInCwd = isValidFilePathInCwd;
var promptValidateFilePath = function (value) {
    if (!(0, exports.isValidFilePathInCwd)(value)) {
        return "Path must resolve to a directory in the current project root.";
    }
};
exports.promptValidateFilePath = promptValidateFilePath;
var stripTrailingSlash = function (p) {
    return p.replace(/\/$/, '');
};
exports.stripTrailingSlash = stripTrailingSlash;
var getGeneratedCodeDirectoryFullPath = function (rcSettings) { return __awaiter(void 0, void 0, void 0, function () {
    var generatedCodeDirectory, origGeneratedCodeDirectory, error, value, fullPath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                generatedCodeDirectory = rcSettings.generatedCodeDirectory;
                origGeneratedCodeDirectory = generatedCodeDirectory;
                error = null;
                generatedCodeDirectory = generatedCodeDirectory ? generatedCodeDirectory.trim() : '';
                if (!origGeneratedCodeDirectory) {
                    error = new Error("Generated code directory (".concat(picocolors_1.default.cyan('generatedCodeDirectory'), ") not found in ").concat((0, utils_js_1.formatFilePath)(getRcFilePath()), "."));
                }
                else if (!(0, exports.isValidFilePathInCwd)(generatedCodeDirectory)) {
                    error = new Error("Invalid generated code directory (".concat(picocolors_1.default.cyan('generatedCodeDirectory'), ") in ").concat((0, utils_js_1.formatFilePath)(getRcFilePath()), ". Path must resolve to a directory in the current project root."));
                }
                if (!error) return [3 /*break*/, 3];
                prompts_1.log.error((0, utils_js_1.splitString)(error.message).join('\n'));
                prompts_1.log.message((0, utils_js_1.splitString)("\n        Relative path to the folder where \n         model and other application code will be generated.\n        ").join('\n'));
                return [4 /*yield*/, (0, prompts_1.text)({
                        message: 'Generated code directory path:',
                        placeholder: 'Relative path from the project root',
                        initialValue: '',
                        validate: exports.promptValidateFilePath
                    })];
            case 1:
                value = _a.sent();
                if ((0, prompts_1.isCancel)(value)) {
                    return [2 /*return*/, (0, utils_js_1.cancelAndExit)()];
                }
                generatedCodeDirectory = value;
                return [4 /*yield*/, writeRcSettings({ generatedCodeDirectory: generatedCodeDirectory })];
            case 2:
                rcSettings = _a.sent();
                _a.label = 3;
            case 3:
                fullPath = (0, path_1.join)(process.cwd(), generatedCodeDirectory);
                return [2 /*return*/, { rcSettings: rcSettings, generatedCodeDirectoryFullPath: fullPath }];
        }
    });
}); };
var getSchemaDirectoryFullPath = function (rcSettings) { return __awaiter(void 0, void 0, void 0, function () {
    var schemaDirectory, origSchemaDirectory, error, value, fullPath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                schemaDirectory = rcSettings.schemaDirectory;
                origSchemaDirectory = schemaDirectory;
                error = null;
                schemaDirectory = schemaDirectory ? schemaDirectory.trim() : '';
                if (!origSchemaDirectory) {
                    error = new Error("Schema directory (".concat(picocolors_1.default.cyan('schemaDirectory'), ") not found in ").concat((0, utils_js_1.formatFilePath)(getRcFilePath()), "."));
                }
                else if (!(0, exports.isValidFilePathInCwd)(schemaDirectory)) {
                    error = new Error("Invalid schema directory (".concat(picocolors_1.default.cyan('schemaDirectory'), ") in ").concat((0, utils_js_1.formatFilePath)(getRcFilePath()), ". Path must resolve to a directory in the current project root."));
                }
                if (!error) return [3 /*break*/, 3];
                prompts_1.log.error((0, utils_js_1.splitString)(error.message).join('\n'));
                prompts_1.log.message((0, utils_js_1.splitString)("\n          The  schema directory contains the current schema, \n          the current migration, and the migration history.\n        ").join('\n'));
                return [4 /*yield*/, (0, prompts_1.text)({
                        message: 'Schema directory path:',
                        placeholder: 'Relative path from the project root',
                        initialValue: 'schema',
                        validate: exports.promptValidateFilePath
                    })];
            case 1:
                value = _a.sent();
                if ((0, prompts_1.isCancel)(value)) {
                    return [2 /*return*/, (0, utils_js_1.cancelAndExit)()];
                }
                schemaDirectory = value;
                return [4 /*yield*/, writeRcSettings({ schemaDirectory: schemaDirectory })];
            case 2:
                rcSettings = _a.sent();
                _a.label = 3;
            case 3:
                fullPath = (0, path_1.join)(process.cwd(), schemaDirectory);
                return [2 /*return*/, { rcSettings: rcSettings, schemaDirectoryFullPath: fullPath }];
        }
    });
}); };
var getDatabaseUrl = function (rcSettings) { return __awaiter(void 0, void 0, void 0, function () {
    var read, envFile, origEnvFile, result, fix, newEnvFile, done;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                read = function (relPath) { return __awaiter(void 0, void 0, void 0, function () {
                    var path, exists, content, env, keys, _i, keys_1, key;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                path = (0, path_1.join)(process.cwd(), relPath);
                                return [4 /*yield*/, fs_extra_1.default.exists(path)];
                            case 1:
                                exists = _a.sent();
                                if (!exists) {
                                    return [2 /*return*/, new Error("The environment file at ".concat((0, utils_js_1.formatFilePath)(path), " does not exist."))];
                                }
                                return [4 /*yield*/, fs_extra_1.default.readFile((0, path_1.join)(process.cwd(), relPath), 'utf-8')];
                            case 2:
                                content = _a.sent();
                                env = {};
                                try {
                                    env = (0, dotenv_1.parse)(content);
                                }
                                catch (error) {
                                    return [2 /*return*/, new Error("The environment file at ".concat((0, utils_js_1.formatFilePath)(path), " could not be parsed by dotenv."))];
                                }
                                keys = constants_js_1.ENV_DB_URL_KEYS.filter(function (key) { return typeof env[key] === 'string'; });
                                for (_i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                                    key = keys_1[_i];
                                    if ((0, exports.isValidDatabaseURL)(env[key])) {
                                        return [2 /*return*/, {
                                                databaseUrl: env[key],
                                                envFileKey: key
                                            }];
                                    }
                                }
                                return [2 /*return*/, new Error("Could not find a valid database URL as either ".concat(constants_js_1.ENV_DB_URL_KEYS.map(function (k) { return picocolors_1.default.magenta(k); }).join(' or '), " in ").concat((0, utils_js_1.formatFilePath)(path), "."))];
                        }
                    });
                }); };
                envFile = rcSettings.envFile;
                origEnvFile = envFile;
                if (!envFile) {
                    envFile = '.env';
                }
                return [4 /*yield*/, read(envFile)];
            case 1:
                result = _a.sent();
                _a.label = 2;
            case 2:
                if (!(result instanceof Error)) return [3 /*break*/, 8];
                prompts_1.log.error(__spreadArray([
                    "Database URL not found in ".concat((0, utils_js_1.formatFilePath)(envFile))
                ], (0, utils_js_1.splitString)(result.message), true).join('\n'));
                return [4 /*yield*/, (0, prompts_1.select)({
                        message: 'Fix',
                        options: [
                            {
                                label: "Add the database URL variable to ".concat((0, utils_js_1.formatFilePath)(envFile)),
                                value: envFile
                            },
                            {
                                label: "Specify a different environment file",
                                value: 'different'
                            },
                            {
                                label: 'Cancel',
                                value: 'cancel'
                            }
                        ]
                    })];
            case 3:
                fix = _a.sent();
                if ((0, prompts_1.isCancel)(fix) || fix === 'cancel') {
                    return [2 /*return*/, (0, utils_js_1.cancelAndExit)()];
                }
                if (!(fix !== envFile)) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, prompts_1.text)({
                        message: 'Path to file',
                        placeholder: 'Relative path from project root',
                        validate: exports.promptValidateFilePath
                    })];
            case 4:
                newEnvFile = _a.sent();
                if ((0, prompts_1.isCancel)(newEnvFile)) {
                    return [2 /*return*/, (0, utils_js_1.cancelAndExit)()];
                }
                envFile = newEnvFile;
                _a.label = 5;
            case 5:
                prompts_1.log.message(__spreadArray([
                    "1. Create ".concat(picocolors_1.default.cyan(envFile), " if it does not exist."),
                    "2. Make sure ".concat(picocolors_1.default.cyan(envFile), " is .gitignore'd."),
                    "3. Add the database URL to ".concat(picocolors_1.default.cyan(envFile), " as one of:")
                ], constants_js_1.ENV_DB_URL_KEYS.map(function (k) {
                    return picocolors_1.default.gray("   ".concat(k, "=").concat(constants_js_1.FORMATTED_DB_URL_EXAMPLE));
                }), true).join('\n'));
                return [4 /*yield*/, (0, prompts_1.confirm)({
                        message: 'Confirm:',
                        active: "I've done this",
                        inactive: 'Cancel'
                    })];
            case 6:
                done = _a.sent();
                if ((0, prompts_1.isCancel)(done) || !done) {
                    return [2 /*return*/, (0, utils_js_1.cancelAndExit)()];
                }
                return [4 /*yield*/, read(envFile)];
            case 7:
                result = _a.sent();
                return [3 /*break*/, 2];
            case 8:
                if (!(origEnvFile !== envFile)) return [3 /*break*/, 10];
                return [4 /*yield*/, writeRcSettings({
                        envFile: envFile
                    })];
            case 9:
                rcSettings = _a.sent();
                _a.label = 10;
            case 10: return [2 /*return*/, { rcSettings: rcSettings, databaseUrl: result.databaseUrl, sourceFile: envFile, sourceKey: result.envFileKey }];
        }
    });
}); };
