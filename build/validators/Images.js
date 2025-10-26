"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageSchema = exports.pullImageSchema = void 0;
const zod_1 = require("zod");
exports.pullImageSchema = zod_1.z.object({
    name: zod_1.z.string(),
});
exports.createImageSchema = zod_1.z.object({
    name: zod_1.z.string(),
    token: zod_1.z.string(),
    tag: zod_1.z.string(),
});
