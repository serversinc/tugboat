import { z } from "zod";

/**
 * Schema for creating a container.
 * @example
 * {
 *   "name": "my-container",
 *   "image": "nginx:latest",
 *   "hostConfig": {
 *     "NetworkMode": "bridge",
 *     "PortBindings": {
 *       "80/tcp": [{ "HostPort": "8080" }]
 *     },
 *     "Binds": ["/host/path:/container/path"]
 *   },
 *   "networks": ["agent"],
 *   "environment": ["ENV_VAR=value"],
 *   "start": true
 * }
 */
export const createContainerSchema = z.object({
  name: z.string(),
  environment: z.array(z.string()).optional(),
  ports: z.array(z.string()).optional(),
  image: z.string(),
  hostConfig: z.object({
    NetworkMode: z.string().optional(),
    PortBindings: z.record(z.array(z.object({ HostPort: z.string() }))).optional(),
    AutoRemove: z.boolean().optional(),
    Binds: z.array(z.string()).optional(),
  }),
  command: z.array(z.string()).optional(),
  entrypoint: z.string().optional(),
  workingdir: z.string().optional(),
  start: z.boolean().optional(),
  labels: z.record(z.string()).optional(),
  networks: z.array(z.string()),
  restartPolicy: z
    .object({
      Name: z.string().optional(),
      MaximumRetryCount: z.number().optional(),
    })
    .optional(),
});
