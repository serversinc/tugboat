import { z } from "zod";

export const createContainerSchema = z.object({
  name: z.string(),
  Env: z.array(z.string()).optional(),
  ExposedPorts: z.record(z.object({}).optional()).optional(),
  Image: z.string(),
  Labels: z.record(z.string()).optional(),
  HostConfig: z
    .object({
      NetworkMode: z.string().optional(),
      PortBindings: z.record(z.array(z.object({ HostPort: z.string() }))).optional(),
      AutoRemove: z.boolean().optional(),
    })
    .optional(),
  Tty: z.boolean().optional(),
  Cmd: z.array(z.string()).optional(),
  Entrypoint: z.string().optional(),
  WorkingDir: z.string().optional(),
});
