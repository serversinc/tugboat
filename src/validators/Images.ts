import { z } from "zod";

export const pullImageSchema = z.object({
  name: z.string(),
});
