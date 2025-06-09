import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://klvnrfrazdzcjbwanuyg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsdm5yZnJhemR6Y2pid2FudXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODc0MjQsImV4cCI6MjA2NDk2MzQyNH0.lJ4p9T4nRt0ihlyYW_DgR9ksBUnzumKQNMvwbGBozwE";

export const supabase = createClient(supabaseUrl, supabaseKey);
