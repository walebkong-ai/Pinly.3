require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("Missing URL or KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.storage.getBucket('media');
  if (error) {
    console.error("Error getting bucket:", error.message);
  } else {
    console.log("Bucket data:", data);
  }
}

check();
