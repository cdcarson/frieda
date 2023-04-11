"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showHelp = exports.getValueFlag = exports.getOptionFlag = exports.getCommand = exports.COMMANDS = exports.GLOBAL_OPTIONS = void 0;
var picocolors_1 = require("picocolors");
exports.GLOBAL_OPTIONS = [
    {
        long: 'help',
        short: 'h',
        description: 'Show help'
    },
    {
        long: 'version',
        short: 'v',
        description: 'Show version'
    }
];
exports.COMMANDS = {
    migrate: {
        id: 'migrate',
        description: "Execute the current migration."
    },
    generate: {
        id: 'generate',
        description: "Generate code."
    },
    show: {
        id: 'show',
        description: 'Show model details.'
    },
    fetch: {
        id: 'fetch',
        description: "Fetch the database schema."
    }
};
var getCommand = function (args) {
    if (args.length === 0) {
        return {
            restArgs: args
        };
    }
    for (var _i = 0, _a = Object.values(exports.COMMANDS); _i < _a.length; _i++) {
        var command = _a[_i];
        if (args[0] === command.id || args[0] === command.id[0]) {
            return {
                command: command,
                restArgs: args.slice(1)
            };
        }
    }
    return {
        restArgs: args
    };
};
exports.getCommand = getCommand;
var getOptionFlag = function (args, long, short) {
    var matches = ["--".concat(long)];
    if (short) {
        matches.push("-".concat(short));
    }
    for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
        var arg = args_1[_i];
        if (matches.includes(arg)) {
            return true;
        }
    }
    return false;
};
exports.getOptionFlag = getOptionFlag;
var getValueFlag = function (args, long, short) {
    var matches = ["--".concat(long)];
    if (short) {
        matches.push("-".concat(short));
    }
    for (var _i = 0, args_2 = args; _i < args_2.length; _i++) {
        var arg = args_2[_i];
        var parts = arg.split('=');
        if (!parts[1] || parts[1].length === 0) {
            return undefined;
        }
        if (matches.includes(parts[0])) {
            return parts[0];
        }
    }
};
exports.getValueFlag = getValueFlag;
var showHelp = function () {
    var ordered = [
        'fetch',
        'generate',
        'show',
        'migrate',
    ];
    console.log("".concat(picocolors_1.default.dim('Usage:'), " frieda ").concat(picocolors_1.default.magenta('[command]'), " ").concat(picocolors_1.default.blue('[options]')));
    console.log();
    console.log(picocolors_1.default.dim('Commands:'));
    var colSize = Math.max.apply(Math, Object.values(exports.COMMANDS).map(function (c) { return c.id.length; }));
    ordered.forEach(function (id) {
        var c = exports.COMMANDS[id];
        var addedSpaces = ' '.repeat(colSize - c.id.length);
        console.log("".concat(picocolors_1.default.magenta(c.id[0])).concat(picocolors_1.default.dim('|')).concat(picocolors_1.default.magenta(c.id), "   ").concat(addedSpaces).concat(picocolors_1.default.gray(c.description)));
    });
    console.log();
    console.log(picocolors_1.default.dim('Global options:'));
    colSize = Math.max.apply(Math, exports.GLOBAL_OPTIONS.map(function (o) { return o.long.length; }));
    exports.GLOBAL_OPTIONS.forEach(function (o) {
        var addedSpaces = ' '.repeat(colSize - o.long.length);
        var short = o.short ? picocolors_1.default.blue("-".concat(o.short)) + picocolors_1.default.dim('|') : '  ';
        var long = picocolors_1.default.blue("--".concat(o.long));
        console.log("".concat(short).concat(long, "  ").concat(addedSpaces).concat(picocolors_1.default.gray(o.description)));
    });
    console.log();
};
exports.showHelp = showHelp;
