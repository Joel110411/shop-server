{\rtf1\ansi\ansicpg1252\cocoartf2580
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;\f1\fnil\fcharset0 AppleColorEmoji;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import express from "express";\
import cors from "cors";\
import \{ createClient \} from "@supabase/supabase-js";\
import nodemailer from "nodemailer";\
\
const app = express();\
app.use(cors());\
app.use(express.json());\
\
// 
\f1 \uc0\u55357 \u56593 
\f0  DEINE DATEN\
const supabase = createClient(\
  "https://https://mxrzoooqucraxhuixvak.supabase.co",\
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnpvb29xdWNyYXhodWl4dmFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjg1NzQsImV4cCI6MjA4OTk0NDU3NH0.XKZZD3JnI-8EjZbeth_p4pcam14ZXE-daDK4FJBZ4MA"\
);\
\
// 
\f1 \uc0\u55357 \u56551 
\f0  MAIL CONFIG\
const transporter = nodemailer.createTransport(\{\
  service: "gmail",\
  auth: \{\
    user: "joel.burghardt@mein.gmx",\
    pass: "QXVP4REYE4YF5LQJ524R"\
  \}\
\});\
\
// 
\f1 \uc0\u55357 \u56592 
\f0  CODE GENERATOR\
function generateCode()\{\
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";\
  let code = "";\
  for(let i=0;i<7;i++)\{\
    code += chars[Math.floor(Math.random()*chars.length)];\
  \}\
  return code;\
\}\
\
// =========================\
// CODE SENDEN\
// =========================\
app.post("/send-code", async (req,res)=>\{\
\
const \{ username \} = req.body;\
\
const code = generateCode();\
\
await supabase.from("login_codes").insert([\{\
  username,\
  code,\
  expires: new Date(Date.now() + 5*60*1000)\
\}]);\
\
// 
\f1 \uc0\u55357 \u56551 
\f0  MAIL\
await transporter.sendMail(\{\
  from: "Shop",\
  to: "joel.burghardt@mein.gmx",\
  subject: "Login Code",\
  text: `User: $\{username\}\\nCode: $\{code\}`\
\});\
\
res.json(\{ success:true \});\
\
\});\
\
// =========================\
// VERIFY\
// =========================\
app.post("/verify", async (req,res)=>\{\
\
const \{ username, code \} = req.body;\
\
const \{ data \} = await supabase\
.from("login_codes")\
.select("*")\
.eq("username", username)\
.eq("code", code)\
.single();\
\
if(!data)\{\
return res.json(\{ success:false \});\
\}\
\
// SESSION\
await supabase.from("sessions").insert([\{ username \}]);\
\
res.json(\{ success:true \});\
\
\});\
\
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server läuft"));