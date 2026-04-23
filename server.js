import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

console.log("Server startet...");

// ✅ APP ZUERST
const app = express();

// ✅ DANN MIDDLEWARE
app.use(cors({
  origin: [
    "https://sixteenquarters.netlify.app",
    "http://localhost:5500"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// OPTIONAL (stabiler CORS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://sixteenquarters.netlify.app");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

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
function generateCode(){
  return Math.floor(100000 + Math.random()*900000).toString();
}

// =====================
// SEND CODE
// =====================
app.post("/send-code", async (req,res)=>{

try{

const { email } = req.body;
const code = generateCode();

await supabase.from("login_codes").insert([{
email,
code,
expires: new Date(Date.now()+5*60*1000)
}]);

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

}catch(err){
console.error(err);
res.status(500).json({ success:false });
}

});

// =====================
// VERIFY
// =====================
app.post("/verify", async (req,res)=>{

try{

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

await supabase.from("sessions").insert([{ email }]);

res.json({ success:true });

}catch(err){
console.error(err);
res.status(500).json({ success:false });
}

});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
  console.log("Server läuft auf Port", PORT);
});
