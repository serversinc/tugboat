"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNetworkSchema = void 0;
const zod_1 = require("zod");
exports.createNetworkSchema = zod_1.z.object({
    name: zod_1.z.string(),
    driver: zod_1.z.string().optional(),
    checkDuplicate: zod_1.z.boolean().optional(),
    internal: zod_1.z.boolean().optional(),
    attachable: zod_1.z.boolean().optional(),
    ingress: zod_1.z.boolean().optional(),
    enable_ipv6: zod_1.z.boolean().optional(),
    labels: zod_1.z.record(zod_1.z.string()).optional(),
});
