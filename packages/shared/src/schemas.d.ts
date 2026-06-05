import { z } from 'zod';
export declare const bdPhoneSchema: z.ZodString;
export declare const registerPhoneSchema: z.ZodObject<{
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
}, {
    phone: string;
}>;
export declare const registerOtpSchema: z.ZodObject<{
    phone: z.ZodString;
    otp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
    otp: string;
}, {
    phone: string;
    otp: string;
}>;
export declare const registerAccountSchema: z.ZodObject<{
    full_name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    phone: z.ZodString;
    verify_token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
    full_name: string;
    email: string;
    password: string;
    verify_token: string;
}, {
    phone: string;
    full_name: string;
    email: string;
    password: string;
    verify_token: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createSessionSchema: z.ZodObject<{
    name: z.ZodString;
    webhook_url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    webhook_secret: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    proxy_url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    webhook_url?: string | undefined;
    webhook_secret?: string | undefined;
    proxy_url?: string | undefined;
}, {
    name: string;
    webhook_url?: string | undefined;
    webhook_secret?: string | undefined;
    proxy_url?: string | undefined;
}>;
export declare const updateSessionSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    webhook_url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    webhook_secret: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    webhook_events: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    proxy_url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    account_protection: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    webhook_url?: string | undefined;
    webhook_secret?: string | undefined;
    proxy_url?: string | undefined;
    webhook_events?: string[] | undefined;
    account_protection?: boolean | undefined;
}, {
    name?: string | undefined;
    webhook_url?: string | undefined;
    webhook_secret?: string | undefined;
    proxy_url?: string | undefined;
    webhook_events?: string[] | undefined;
    account_protection?: boolean | undefined;
}>;
export declare const createTokenSchema: z.ZodObject<{
    name: z.ZodString;
    expires_at: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    expires_at?: string | undefined;
}, {
    name: string;
    expires_at?: string | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    full_name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    full_name?: string | undefined;
}, {
    full_name?: string | undefined;
}>;
export declare const sendMessageSchema: z.ZodEffects<z.ZodObject<{
    to: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["text", "image", "video", "audio", "document", "sticker", "location", "contact", "poll", "reaction"]>>;
    text: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    base64: z.ZodOptional<z.ZodString>;
    caption: z.ZodOptional<z.ZodString>;
    filename: z.ZodOptional<z.ZodString>;
    mimetype: z.ZodOptional<z.ZodString>;
    quoted_message_id: z.ZodOptional<z.ZodString>;
    view_once: z.ZodOptional<z.ZodBoolean>;
    emoji: z.ZodOptional<z.ZodString>;
    message_id: z.ZodOptional<z.ZodString>;
    preview_url: z.ZodOptional<z.ZodBoolean>;
    gif_playback: z.ZodOptional<z.ZodBoolean>;
    ptt: z.ZodOptional<z.ZodBoolean>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    contact_name: z.ZodOptional<z.ZodString>;
    contact_phone: z.ZodOptional<z.ZodString>;
    question: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    multi_select: z.ZodOptional<z.ZodBoolean>;
    mentions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    template_data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "location" | "contact" | "poll" | "reaction";
    to: string;
    options?: string[] | undefined;
    base64?: string | undefined;
    url?: string | undefined;
    text?: string | undefined;
    caption?: string | undefined;
    filename?: string | undefined;
    mimetype?: string | undefined;
    quoted_message_id?: string | undefined;
    view_once?: boolean | undefined;
    emoji?: string | undefined;
    message_id?: string | undefined;
    preview_url?: boolean | undefined;
    gif_playback?: boolean | undefined;
    ptt?: boolean | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    contact_name?: string | undefined;
    contact_phone?: string | undefined;
    question?: string | undefined;
    multi_select?: boolean | undefined;
    mentions?: string[] | undefined;
    template_data?: Record<string, string> | undefined;
}, {
    to: string;
    options?: string[] | undefined;
    type?: "text" | "image" | "video" | "audio" | "document" | "sticker" | "location" | "contact" | "poll" | "reaction" | undefined;
    base64?: string | undefined;
    url?: string | undefined;
    text?: string | undefined;
    caption?: string | undefined;
    filename?: string | undefined;
    mimetype?: string | undefined;
    quoted_message_id?: string | undefined;
    view_once?: boolean | undefined;
    emoji?: string | undefined;
    message_id?: string | undefined;
    preview_url?: boolean | undefined;
    gif_playback?: boolean | undefined;
    ptt?: boolean | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    contact_name?: string | undefined;
    contact_phone?: string | undefined;
    question?: string | undefined;
    multi_select?: boolean | undefined;
    mentions?: string[] | undefined;
    template_data?: Record<string, string> | undefined;
}>, {
    type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "location" | "contact" | "poll" | "reaction";
    to: string;
    options?: string[] | undefined;
    base64?: string | undefined;
    url?: string | undefined;
    text?: string | undefined;
    caption?: string | undefined;
    filename?: string | undefined;
    mimetype?: string | undefined;
    quoted_message_id?: string | undefined;
    view_once?: boolean | undefined;
    emoji?: string | undefined;
    message_id?: string | undefined;
    preview_url?: boolean | undefined;
    gif_playback?: boolean | undefined;
    ptt?: boolean | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    contact_name?: string | undefined;
    contact_phone?: string | undefined;
    question?: string | undefined;
    multi_select?: boolean | undefined;
    mentions?: string[] | undefined;
    template_data?: Record<string, string> | undefined;
}, {
    to: string;
    options?: string[] | undefined;
    type?: "text" | "image" | "video" | "audio" | "document" | "sticker" | "location" | "contact" | "poll" | "reaction" | undefined;
    base64?: string | undefined;
    url?: string | undefined;
    text?: string | undefined;
    caption?: string | undefined;
    filename?: string | undefined;
    mimetype?: string | undefined;
    quoted_message_id?: string | undefined;
    view_once?: boolean | undefined;
    emoji?: string | undefined;
    message_id?: string | undefined;
    preview_url?: boolean | undefined;
    gif_playback?: boolean | undefined;
    ptt?: boolean | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    contact_name?: string | undefined;
    contact_phone?: string | undefined;
    question?: string | undefined;
    multi_select?: boolean | undefined;
    mentions?: string[] | undefined;
    template_data?: Record<string, string> | undefined;
}>;
export declare const webhookConfigSchema: z.ZodObject<{
    webhook_url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    webhook_secret: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    webhook_events: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    webhook_events: string[];
    webhook_url?: string | undefined;
    webhook_secret?: string | undefined;
}, {
    webhook_url?: string | undefined;
    webhook_secret?: string | undefined;
    webhook_events?: string[] | undefined;
}>;
