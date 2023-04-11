"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTableInfo = exports.fetchSchema = exports.getSchemaSql = exports.writeSchema = void 0;
var sql_template_tag_1 = require("sql-template-tag");
var fs_extra_1 = require("fs-extra");
var path_1 = require("path");
var utils_js_1 = require("./utils.js");
var writeSchema = function (schema, fullPath) { return __awaiter(void 0, void 0, void 0, function () {
    var s;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                s = (0, utils_js_1.createSpinner)("Saving ".concat((0, utils_js_1.formatFilePath)(fullPath)));
                return [4 /*yield*/, fs_extra_1.default.ensureDir((0, path_1.dirname)(fullPath))];
            case 1:
                _a.sent();
                return [4 /*yield*/, fs_extra_1.default.writeFile(fullPath, (0, exports.getSchemaSql)(schema))];
            case 2:
                _a.sent();
                s.done();
                return [2 /*return*/];
        }
    });
}); };
exports.writeSchema = writeSchema;
var getSchemaSql = function (schema) {
    var comments = [
        "-- Database: ".concat(schema.databaseName),
        "-- Schema fetched: ".concat(schema.fetched.toUTCString())
    ];
    return (comments.join('\n') +
        "\n\n" +
        schema.tables.map(function (t) { return t.tableCreateStatement; }).join('\n\n'));
};
exports.getSchemaSql = getSchemaSql;
var fetchSchema = function (connection) { return __awaiter(void 0, void 0, void 0, function () {
    var s, _a, tableNames, databaseName, results;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                s = (0, utils_js_1.createSpinner)('Fetching schema');
                return [4 /*yield*/, fetchTableNames(connection)];
            case 1:
                _a = _b.sent(), tableNames = _a.tableNames, databaseName = _a.databaseName;
                return [4 /*yield*/, Promise.all(tableNames.map(function (tableName) { return (0, exports.fetchTableInfo)(connection, tableName); }))];
            case 2:
                results = _b.sent();
                s.done();
                return [2 /*return*/, {
                        fetched: new Date(),
                        databaseName: databaseName,
                        tableNames: tableNames,
                        tables: results
                    }];
        }
    });
}); };
exports.fetchSchema = fetchSchema;
var fetchTableNames = function (connection) { return __awaiter(void 0, void 0, void 0, function () {
    var query, executedQuery, nameKey, result, rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = (0, sql_template_tag_1.default)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SHOW FULL TABLES;"], ["SHOW FULL TABLES;"])));
                return [4 /*yield*/, connection.execute(query.sql)];
            case 1:
                executedQuery = _a.sent();
                nameKey = executedQuery.fields[0].name;
                result = {
                    databaseName: nameKey.replace(/^tables_in_/gi, ''),
                    tableNames: []
                };
                rows = executedQuery.rows;
                rows.forEach(function (row) {
                    var keys = Object.keys(row);
                    var k0 = keys[0];
                    var k1 = keys[1];
                    // ignore views for now
                    if (row[k1] !== 'BASE TABLE') {
                        return;
                    }
                    var tableName = row[k0];
                    result.tableNames.push(tableName);
                });
                return [2 /*return*/, result];
        }
    });
}); };
var fetchTableCreateSql = function (connection, tableName) { return __awaiter(void 0, void 0, void 0, function () {
    var query, result, row;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = (0, sql_template_tag_1.default)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["SHOW CREATE TABLE ", ";"], ["SHOW CREATE TABLE ", ";"])), (0, sql_template_tag_1.raw)(tableName));
                return [4 /*yield*/, connection.execute(query.sql)];
            case 1:
                result = _a.sent();
                row = result.rows[0];
                return [2 /*return*/, row['Create Table'] + ';'];
        }
    });
}); };
var fetchTableColumnsInfo = function (connection, tableName) { return __awaiter(void 0, void 0, void 0, function () {
    var query, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = (0, sql_template_tag_1.default)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["SHOW FULL COLUMNS FROM ", ";"], ["SHOW FULL COLUMNS FROM ", ";"])), (0, sql_template_tag_1.raw)(tableName));
                return [4 /*yield*/, connection.execute(query.sql)];
            case 1:
                result = _a.sent();
                return [2 /*return*/, result.rows];
        }
    });
}); };
var fetchTableIndexesInfo = function (connection, tableName) { return __awaiter(void 0, void 0, void 0, function () {
    var query, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = (0, sql_template_tag_1.default)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["SHOW INDEXES FROM ", ";"], ["SHOW INDEXES FROM ", ";"])), (0, sql_template_tag_1.raw)(tableName));
                return [4 /*yield*/, connection.execute(query.sql)];
            case 1:
                result = _a.sent();
                return [2 /*return*/, result.rows];
        }
    });
}); };
var fetchTableInfo = function (connection, tableName) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, tableCreateStatement, columns, indexes;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, Promise.all([
                    fetchTableCreateSql(connection, tableName),
                    fetchTableColumnsInfo(connection, tableName),
                    fetchTableIndexesInfo(connection, tableName)
                ])];
            case 1:
                _a = _b.sent(), tableCreateStatement = _a[0], columns = _a[1], indexes = _a[2];
                return [2 /*return*/, {
                        name: tableName,
                        tableCreateStatement: tableCreateStatement,
                        columns: columns,
                        indexes: indexes
                    }];
        }
    });
}); };
exports.fetchTableInfo = fetchTableInfo;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
