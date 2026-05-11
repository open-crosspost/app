import { z } from "zod";

export interface NearAuthData {
  account_id: string;
  public_key: string;
  signature: string;
  message: string;
  nonce: number[];
  recipient: string;
  callback_url?: string;
}

// Zod schema for validation
export const NearAuthDataSchema = z.object({
  account_id: z.string(),
  public_key: z.string(),
  signature: z.string(),
  message: z.string(),
  nonce: z.array(z.number()),
  recipient: z.string(),
  callback_url: z.string().optional(),
});
