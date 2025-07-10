import { z } from "zod";

export const pullImageSchema = z.object({
  name: z.string(),
});

export const createImageSchema = z.object({
  name: z.string(),
  token: z.string(),
  tag: z.string(),
});
