#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("./cli/index.js");
var version_js_1 = require("./version.js");
try {
    await (0, index_js_1.main)(version_js_1.VERSION);
    process.exit(0);
}
catch (error) {
    console.error(error);
    process.exit(1);
}
exports.default = {};
