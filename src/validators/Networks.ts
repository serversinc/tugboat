import { z } from "zod";

export const createNetworkSchema = z.object({
  name: z.string(),
  driver: z.string().optional(),
  checkDuplicate: z.boolean().optional(),
  internal: z.boolean().optional(),
  attachable: z.boolean().optional(),
  ingress: z.boolean().optional(),
  enable_ipv6: z.boolean().optional(),
  labels: z.record(z.string()).optional(),
});
