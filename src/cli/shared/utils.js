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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpinner = exports.splitString = exports.getServerlessConnection = exports.getMysql2Connection = exports.cancelAndExit = exports.prettify = exports.formatFilePath = void 0;
var picocolors_1 = require("picocolors");
var prettier_1 = require("prettier");
var path_1 = require("path");
var prompts_1 = require("@clack/prompts");
var fs_extra_1 = require("fs-extra");
var promise_1 = require("mysql2/promise");
var database_1 = require("@planetscale/database");
var formatFilePath = function (p) {
    return picocolors_1.default.underline(picocolors_1.default.cyan((0, path_1.relative)(process.cwd(), p)));
};
exports.formatFilePath = formatFilePath;
var prettify = function (contents, filePath) { return __awaiter(void 0, void 0, void 0, function () {
    var config;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prettier_1.default.resolveConfig(filePath)];
            case 1:
                config = _a.sent();
                return [2 /*return*/, prettier_1.default.format(contents, __assign(__assign({}, config), { filepath: filePath }))];
        }
    });
}); };
exports.prettify = prettify;
var cancelAndExit = function () {
    (0, prompts_1.cancel)('Operation cancelled.');
    process.exit(0);
};
exports.cancelAndExit = cancelAndExit;
var getMysql2Connection = function (databaseUrl) { return __awaiter(void 0, void 0, void 0, function () {
    var ca, error_1, connection, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ca = null;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, fs_extra_1.default.readFile('/etc/ssl/cert.pem')];
            case 2:
                ca = _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                throw Error('Could not read /etc/ssl/cert.pem');
            case 4:
                _a.trys.push([4, 6, , 7]);
                return [4 /*yield*/, (0, promise_1.createConnection)({
                        uri: databaseUrl,
                        multipleStatements: true,
                        ssl: {
                            ca: ca
                        }
                    })];
            case 5:
                connection = _a.sent();
                return [2 /*return*/, connection];
            case 6:
                error_2 = _a.sent();
                throw Error('Could not connect to the database.');
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.getMysql2Connection = getMysql2Connection;
var getServerlessConnection = function (databaseUrl) {
    return (0, database_1.connect)({
        url: databaseUrl
    });
};
exports.getServerlessConnection = getServerlessConnection;
var splitString = function (s, lineLength) {
    if (lineLength === void 0) { lineLength = 75; }
    var lines = [''];
    var words = s
        .split(/\s+/)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; });
    while (words.length > 0) {
        var word = words.shift();
        var rx = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
        var wordLength = word.replaceAll(rx, '').length;
        if (lines[lines.length - 1].length + wordLength > lineLength) {
            lines.push('');
        }
        lines[lines.length - 1] += "".concat(word, " ");
    }
    return lines;
};
exports.splitString = splitString;
var createSpinner = function (msg) {
    var s = (0, prompts_1.spinner)();
    s.start("".concat(msg, "..."));
    return {
        done: function () {
            s.stop("".concat(msg, "...done."));
        },
        error: function () {
            s.stop(picocolors_1.default.strikethrough("".concat(msg, "...")));
        }
    };
};
exports.createSpinner = createSpinner;
