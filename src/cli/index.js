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
exports.main = void 0;
var prompts_1 = require("@clack/prompts");
var picocolors_1 = require("picocolors");
var utils_js_1 = require("./shared/utils.js");
var commands_js_1 = require("./shared/commands.js");
var cmd_fetch_js_1 = require("./cmd-fetch.js");
var cmd_generate_js_1 = require("./cmd-generate.js");
var cmd_migrate_js_1 = require("./cmd-migrate.js");
var cmd_show_js_1 = require("./cmd-show.js");
var showHeader = function (version) {
    console.log("".concat(picocolors_1.default.bold('frieda'), " \uD83D\uDC15 ").concat(picocolors_1.default.dim("v".concat(version))));
    console.log();
};
var main = function (version) { return __awaiter(void 0, void 0, void 0, function () {
    var args, _a, command, restArgs, _b, error_1, logError;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                args = process.argv.slice(2);
                _a = (0, commands_js_1.getCommand)(args), command = _a.command, restArgs = _a.restArgs;
                showHeader(version);
                if (!command) {
                    if (!(0, commands_js_1.getOptionFlag)(args, 'version', 'v')) {
                        (0, commands_js_1.showHelp)();
                    }
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 11, , 12]);
                _b = command.id;
                switch (_b) {
                    case 'migrate': return [3 /*break*/, 2];
                    case 'fetch': return [3 /*break*/, 4];
                    case 'generate': return [3 /*break*/, 6];
                    case 'show': return [3 /*break*/, 8];
                }
                return [3 /*break*/, 10];
            case 2: return [4 /*yield*/, (0, cmd_migrate_js_1.cmdMigrate)()];
            case 3:
                _c.sent();
                return [3 /*break*/, 10];
            case 4: return [4 /*yield*/, (0, cmd_fetch_js_1.cmdFetch)()];
            case 5:
                _c.sent();
                return [3 /*break*/, 10];
            case 6: return [4 /*yield*/, (0, cmd_generate_js_1.cmdGenerate)()];
            case 7:
                _c.sent();
                return [3 /*break*/, 10];
            case 8: return [4 /*yield*/, (0, cmd_show_js_1.cmdShow)(restArgs)];
            case 9:
                _c.sent();
                return [3 /*break*/, 10];
            case 10: return [3 /*break*/, 12];
            case 11:
                error_1 = _c.sent();
                logError = error_1 instanceof Error ? error_1.message : 'An unknown error occurred.';
                prompts_1.log.error(logError);
                (0, utils_js_1.cancelAndExit)();
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); };
exports.main = main;
