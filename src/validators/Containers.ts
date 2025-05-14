import { z } from "zod";

export const createContainerSchema = z.object({
  name: z.string(),
  environment: z.array(z.string()).optional(),
  ports: z.array(z.string()).optional(),
  image: z.string(),
  hostConfig: z
    .object({
      NetworkMode: z.string().optional(),
      PortBindings: z.record(z.array(z.object({ HostPort: z.string() }))).optional(),
      AutoRemove: z.boolean().optional(),
    })
    .optional(),
  command: z.array(z.string()).optional(),
  entrypoint: z.string().optional(),
  workingdir: z.string().optional(),
  start: z.boolean().optional(),
  labels: z.record(z.string()).optional(),
  volumes: z.array(z.string()).optional(),
  networks: z.array(z.string()).optional(),
  restartPolicy: z
    .object({
      Name: z.string().optional(),
      MaximumRetryCount: z.number().optional(),
    })
    .optional(),
});

// Labels?: { [label: string]: string } | undefined;
// Volumes?: { [volume: string]: {} } | undefined;