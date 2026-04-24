import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

console.log("Server startet...");

const app = express();

// =====================
// CORS
// =====================
app.use(cors({
  origin: "https://sixteenquarters.netlify.app"
}));

app.options("*", cors());

app.use(express.json());

// =====================
// SUPABASE
// =====================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =====================
// CODE GENERATOR
// =====================
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// =====================
// SEND CODE
// =====================
app.post("/send-code", async (req, res) => {

  try {
    const { email } = req.body;

    console.log("EMAIL:", email);

    if (!email) {
      return res.status(400).json({ success: false, error: "No email" });
    }

    const code = generateCode();

    console.log("CODE:", code);

    // 👉 TEST: Supabase
    const dbRes = await supabase.from("login_codes").insert([
      {
        email,
        code,
        expires: new Date(Date.now() + 5 * 60 * 1000),
      },
    ]);

    console.log("DB RESULT:", dbRes);

    // 👉 TEST: Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Login Code",
        html: `<h2>Dein Code: ${code}</h2>`,
      }),
    });

    const result = await response.json();
    console.log("RESEND RESPONSE:", result);

    if (!response.ok) {
      return res.status(500).json({ success: false, error: result });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ success: false });
  }

});

// =====================
// VERIFY
// =====================
app.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    console.log("VERIFY:", email, code);

    // 🔥 Hole den NEUSTEN Code
    const { data, error } = await supabase
      .from("login_codes")
      .select("*")
      .eq("email", email)
      .order("expires", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.json({ success: false });
    }

    const latest = data[0];

    console.log("LATEST CODE:", latest.code);

    // 🔥 Code vergleichen
    if (latest.code !== code) {
      return res.json({ success: false });
    }

    // 🔥 Ablauf prüfen
    if (new Date(latest.expires) < new Date()) {
      return res.json({ success: false, message: "Code abgelaufen" });
    }

    // ✅ Erfolg
    await supabase.from("sessions").insert([{ email }]);

    res.json({ success: true });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// =====================
app.get("/", (req, res) => {
  res.send("Server läuft!");
});

// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
