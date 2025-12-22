"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContainerSchema = void 0;
const zod_1 = require("zod");
exports.createContainerSchema = zod_1.z.object({
    name: zod_1.z.string(),
    environment: zod_1.z.array(zod_1.z.string()).optional(),
    ports: zod_1.z.array(zod_1.z.string()).optional(),
    image: zod_1.z.string(),
    hostConfig: zod_1.z
        .object({
        NetworkMode: zod_1.z.string().optional(),
        PortBindings: zod_1.z.record(zod_1.z.array(zod_1.z.object({ HostPort: zod_1.z.string() }))).optional(),
        AutoRemove: zod_1.z.boolean().optional(),
    })
        .optional(),
    command: zod_1.z.array(zod_1.z.string()).optional(),
    entrypoint: zod_1.z.string().optional(),
    workingdir: zod_1.z.string().optional(),
    start: zod_1.z.boolean().optional(),
    labels: zod_1.z.record(zod_1.z.string()).optional(),
    volumes: zod_1.z.array(zod_1.z.string()).optional(),
    networks: zod_1.z.array(zod_1.z.string()).optional(),
    restartPolicy: zod_1.z
        .object({
        Name: zod_1.z.string().optional(),
        MaximumRetryCount: zod_1.z.number().optional(),
    })
        .optional(),
});
// Labels?: { [label: string]: string } | undefined;
// Volumes?: { [volume: string]: {} } | undefined;
