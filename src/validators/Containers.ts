import { z } from "zod";

export const createContainerSchema = z.object({
  Image: z.string(),
  name: z.string(),
});
