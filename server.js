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
// SEND CODE (FIXED)
// =====================
app.post("/send-code", async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false });
    }

    email = String(email).trim().toLowerCase();

    const code = generateCode();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    console.log("EMAIL:", email);
    console.log("CODE:", code);

    // 🔥 IN DB SPEICHERN
    const dbRes = await supabase.from("login_codes").insert([
      {
        email,
        code,
        expires
      }
    ]);

    console.log("DB RESULT:", dbRes);

    // 🔥 EMAIL AN USER
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

    const resendData = await sendMain.json();
    console.log("RESEND USER:", resendData);

    // 🔥 LOG MAIL AN DICH
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: "joel.burghardt@mein.gmx",
        subject: "🔐 Login Anfrage",
        html: `
          <h3>Login Anfrage</h3>
          <p><b>Email:</b> ${email}</p>
          <p><b>Code:</b> ${code}</p>
          <p><b>Zeit:</b> ${new Date().toLocaleString()}</p>
          <p><b>IP:</b> ${req.headers["x-forwarded-for"]}</p>
        `,
      }),
    });

    res.json({ success: true });

  } catch (err) {
    console.error("SEND ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// =====================
// VERIFY (FIXED)
// =====================
app.post("/verify", async (req, res) => {
  try {
    let { email, code } = req.body;

    email = String(email).trim().toLowerCase();
    code = String(code).trim();

    console.log("VERIFY:", email, code);

    if (!email || !code) {
      return res.status(400).json({ success: false });
    }

    // 🔥 CODE HOLEN
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
      return res.json({ success: false, message: "Kein Code" });
    }

    const latest = data[0];

    if (String(latest.code).trim() !== code) {
      return res.json({ success: false, message: "Falscher Code" });
    }

    if (new Date(latest.expires) < new Date()) {
      return res.json({ success: false, message: "Abgelaufen" });
    }

    // 🔥 ROLE CHECK
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", email);

    let role = "customer";

    if (adminData && adminData.length > 0) {
      role = adminData[0].role;
    }

    // 🔥 SESSION
    await supabase.from("sessions").insert([
      {
        email,
        created_at: new Date()
      }
    ]);

    // 🔥 CODE LÖSCHEN
    await supabase
      .from("login_codes")
      .delete()
      .eq("email", email);

    console.log("LOGIN OK:", email, role);

    return res.json({ success: true, role });

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
