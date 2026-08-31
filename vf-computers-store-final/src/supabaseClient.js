import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qmuflwekhqqcfykayjdx.supabase.co";
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_GKoOE2NCrH26dUCOF5sPvg_KYgly3uc";

export const supabase = createClient(supabaseUrl, supabaseKey);
