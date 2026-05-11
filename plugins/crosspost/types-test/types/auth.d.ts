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
export declare const NearAuthDataSchema: z.ZodObject<{
    account_id: z.ZodString;
    public_key: z.ZodString;
    signature: z.ZodString;
    message: z.ZodString;
    nonce: z.ZodArray<z.ZodNumber>;
    recipient: z.ZodString;
    callback_url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
