import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

// ENV
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =====================
// CODE GENERIEREN
// =====================
function generateCode(){
  return Math.floor(100000 + Math.random()*900000).toString();
}

// =====================
// SEND CODE
// =====================
app.post("/send-code", async (req,res)=>{

const { email } = req.body;
const code = generateCode();

// speichern
await supabase.from("login_codes").insert([{
email,
code,
expires: new Date(Date.now()+5*60*1000)
}]);

// 🔥 RESEND API
await fetch("https://api.resend.com/emails",{
method:"POST",
headers:{
"Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
"Content-Type":"application/json"
},
body: JSON.stringify({
from: "Shop <onboarding@resend.dev>",
to: email,
subject: "Login Code",
html: `<h2>Dein Code: ${code}</h2>`
})
});

res.json({ success:true });

});

// =====================
// VERIFY
// =====================
app.post("/verify", async (req,res)=>{

const { email, code } = req.body;

const { data } = await supabase
.from("login_codes")
.select("*")
.eq("email", email)
.eq("code", code)
.single();

if(!data){
return res.json({ success:false });
}

// Session speichern
await supabase.from("sessions").insert([{ email }]);

res.json({ success:true });

});

// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server läuft"));
