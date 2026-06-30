const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://mcxxfpnaofvczmgbjpch.supabase.co";
const SUPABASE_KEY = "sb_publishable_CauAl4hJDDw5zVs4jYNlQg_Yjp_xyGs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;