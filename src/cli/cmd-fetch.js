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
exports.cmdFetch = void 0;
var prompts_1 = require("@clack/prompts");
var commands_js_1 = require("./shared/commands.js");
var picocolors_1 = require("picocolors");
var settings_js_1 = require("./shared/settings.js");
var utils_js_1 = require("./shared/utils.js");
var schema_js_1 = require("./shared/schema.js");
var cmdFetch = function () { return __awaiter(void 0, void 0, void 0, function () {
    var cmd, settings, schema;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                cmd = commands_js_1.COMMANDS.fetch;
                (0, prompts_1.intro)("".concat(picocolors_1.default.bold(cmd.id)).concat(picocolors_1.default.dim(": ".concat(cmd.description))));
                return [4 /*yield*/, (0, settings_js_1.getSettings)()];
            case 1:
                settings = _a.sent();
                return [4 /*yield*/, (0, schema_js_1.fetchSchema)((0, utils_js_1.getServerlessConnection)(settings.databaseUrl))];
            case 2:
                schema = _a.sent();
                return [4 /*yield*/, (0, schema_js_1.writeSchema)(schema, settings.currentSchemaFullPath)];
            case 3:
                _a.sent();
                prompts_1.log.success("Schema saved to ".concat((0, utils_js_1.formatFilePath)(settings.currentSchemaFullPath), "."));
                (0, prompts_1.outro)(picocolors_1.default.bold('Done.'));
                return [2 /*return*/];
        }
    });
}); };
exports.cmdFetch = cmdFetch;
