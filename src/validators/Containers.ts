import { z } from "zod";

export const createContainerSchema = z.object({
  name: z.string(),
  environment: z.array(z.string()).optional(),
  ports: z.array(z.string()).optional(),
  image: z.string(),
  labels: z.record(z.string().optional()).optional(),
  hostConfig: z
    .object({
      NetworkMode: z.string().optional(),
      PortBindings: z.record(z.array(z.object({ HostPort: z.string() }))).optional(),
      AutoRemove: z.boolean().optional(),
    })
    .optional(),
  tty: z.boolean().optional(),
  cmd: z.array(z.string()).optional(),
  entrypoint: z.string().optional(),
  workingdir: z.string().optional(),
  start: z.boolean().optional(),
});
