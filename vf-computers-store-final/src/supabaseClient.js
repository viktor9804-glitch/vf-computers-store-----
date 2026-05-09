import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://qmuflwekhqqcfykayjdx.supabase.co";
export const supabaseKey = "sb_publishable_GKoOE2NCrH26dUCOF5sPvg_KYgly3uc";

export const supabase = createClient(supabaseUrl, supabaseKey);
