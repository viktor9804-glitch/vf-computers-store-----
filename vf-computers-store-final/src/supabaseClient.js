import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://qmuflwekhqqcfykayjdx.supabase.co";

export const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtdWZsd2VraHFxY2Z5a2F5amR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTQyNTAsImV4cCI6MjA5MzkzMDI1MH0.s5wV3VBAiV-LlBa0B5yvCta41E6U9ybM30PbleXs58Y";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);