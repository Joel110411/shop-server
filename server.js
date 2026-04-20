import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

// ENV VARS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// MAIL (GMX)
const transporter = nodemailer.createTransport({
  host: "mail.gmx.net",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// CODE GENERATOR
function generateCode(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for(let i=0;i<6;i++){
    code += chars[Math.floor(Math.random()*chars.length)];
  }
  return code;
}

// SEND CODE
app.post("/send-code", async (req,res)=>{
  const { username } = req.body;

  const code = generateCode();

  await supabase.from("login_codes").insert([{
    username,
    code,
    expires: new Date(Date.now() + 5*60*1000)
  }]);

  await transporter.sendMail({
    from: "Shop",
    to: process.env.EMAIL_USER,
    subject: "Login Code",
    text: `User: ${username}\nCode: ${code}`
  });

  res.json({ success:true });
});

// VERIFY
app.post("/verify", async (req,res)=>{
  const { username, code } = req.body;

  const { data } = await supabase
    .from("login_codes")
    .select("*")
    .eq("username", username)
    .eq("code", code)
    .single();

  if(!data){
    return res.json({ success:false });
  }

  await supabase.from("sessions").insert([{ username }]);

  res.json({ success:true });
});

// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Server läuft"));
