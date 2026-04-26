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
// 🔥 EMAIL SENDEN
const sendMain = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Dein Login Code",
    html: `<h2>Dein Code: ${code}</h2>`,
  }),
});

// 🔥 ZWEITE MAIL AN DICH (LOG)
await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "onboarding@resend.dev",
    to: "joel.burghardt@mein.gmx",
    subject: "🔐 Admin Login Anfrage",
    html: `
      <h3>Login Anfrage</h3>
      <p><b>User:</b> ${identifier}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Zeit:</b> ${new Date().toLocaleString()}</p>
      <p><b>IP:</b> ${req.headers["x-forwarded-for"]}</p>
    `,
  }),
});

// =====================
// VERIFY
// =====================
app.post("/verify", async (req, res) => {
  try {
    let { email, code } = req.body;

    console.log("VERIFY REQUEST RAW:", email, code);

    // 🔥 Eingaben bereinigen (SEHR WICHTIG)
    email = String(email).trim().toLowerCase();
    code = String(code).trim();

    console.log("VERIFY CLEANED:", email, code);

    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const { data: adminData } = await supabase
  .from("admin_users")
  .select("*")
  .eq("email", email);

let role = "customer";

if (adminData && adminData.length > 0) {
  role = adminData[0].role;
}

return res.json({ success: true, role });

    // 🔥 Neuesten Code holen (KEIN .single!)
    const { data, error } = await supabase
      .from("login_codes")
      .select("*")
      .eq("email", email)
      .order("expires", { ascending: false })
      .limit(1);

    if (error) {
      console.error("DB ERROR:", error);
      return res.status(500).json({ success: false });
    }

    if (!data || data.length === 0) {
      console.log("KEIN CODE GEFUNDEN");
      return res.json({ success: false, message: "No code found" });
    }

    const latest = data[0];

    const storedCode = String(latest.code).trim();

    console.log("STORED CODE:", storedCode);
    console.log("INPUT CODE:", code);

    // 🔥 VERGLEICH (JETZT SICHER)
    if (storedCode !== code) {
      console.log("CODE STIMMT NICHT");
      return res.json({ success: false, message: "Wrong code" });
    }

    // 🔥 ABLAUFZEIT CHECK
    if (new Date(latest.expires) < new Date()) {
      console.log("CODE ABGELAUFEN");
      return res.json({ success: false, message: "Code expired" });
    }

    // 🔥 SESSION SPEICHERN
    const sessionRes = await supabase.from("sessions").insert([
      {
        email,
        created_at: new Date()
      }
    ]);
    

    console.log("SESSION RESULT:", sessionRes);

    // 🔥 OPTIONAL: Code löschen nach Nutzung
    await supabase
      .from("login_codes")
      .delete()
      .eq("email", email);

    console.log("LOGIN ERFOLGREICH");

    return res.json({ success: true });

  } catch (err) {
    console.error("VERIFY SERVER ERROR:", err);
    return res.status(500).json({ success: false });
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
