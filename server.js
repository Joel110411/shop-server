import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

console.log("Server startet...");

// =====================
// APP INIT
// =====================
const app = express();

// =====================
// CORS (FINAL FIX)
// =====================
const corsOptions = {
  origin: "https://sixteenquarters.netlify.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

// CORS aktivieren
app.use(cors(corsOptions));

// Preflight (SEHR WICHTIG)
app.options("*", cors(corsOptions));

// JSON Parser
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
 const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Login Code",
    html: `<h2>Code: ${code}</h2>`
  })
});

const result = await response.json();
console.log("RESEND RESPONSE:", result);
    const code = generateCode();

    // In DB speichern
    await supabase.from("login_codes").insert([
      {
        email,
        code,
        expires: new Date(Date.now() + 5 * 60 * 1000),
      },
    ]);

    // Mail senden (Resend)
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shop <onboarding@resend.dev>",
        to: email,
        subject: "Dein Login Code",
        html: `<h2>Dein Code: ${code}</h2>`,
      }),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("SEND CODE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// =====================
// VERIFY CODE
// =====================
app.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false });
    }

    const { data } = await supabase
      .from("login_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .single();

    if (!data) {
      return res.json({ success: false });
    }

    // Session speichern
    await supabase.from("sessions").insert([{ email }]);

    res.json({ success: true });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// =====================
// TEST ROUTE
// =====================
app.get("/", (req, res) => {
  res.send("Server läuft!");
});

// =====================
// SERVER START
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
