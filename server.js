import express from "express";
const app = express();
app.use(express.json({limit:"1mb"}));

app.get("/", (_req,res)=>res.json({service:"justanAi API",status:"online"}));
app.get("/api/status", (_req,res)=>res.json({chat:!!process.env.GEMINI_API_KEY,video:!!process.env.HF_TOKEN}));

app.post("/api/chat", async (req,res)=>{
  try {
    const key=process.env.GEMINI_API_KEY;
    if(!key) return res.status(503).json({error:"Chat AI is not configured yet."});
    const messages=Array.isArray(req.body?.messages)?req.body.messages.slice(-20):[];
    if(!messages.length) return res.status(400).json({error:"Send a message first."});
    const contents=messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:String(m.content||"").slice(0,10000)}]}));
    const model=process.env.GEMINI_MODEL||"gemini-2.5-flash";
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({systemInstruction:{parts:[{text:"You are justanAi, a helpful, friendly and honest AI assistant."}]},contents,generationConfig:{temperature:.7,maxOutputTokens:2048}})
    });
    const data=await r.json();
    if(!r.ok)return res.status(r.status).json({error:data.error?.message||"AI provider error"});
    res.json({answer:data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"No answer returned."});
  } catch(e){res.status(500).json({error:"Chat request failed."});}
});

app.post("/api/video",async(req,res)=>{
  try{
    const prompt=String(req.body?.prompt||"").trim();
    if(!prompt)return res.status(400).json({error:"Enter a video prompt."});
    if(!process.env.HF_TOKEN)return res.status(503).json({error:"Video generation is not configured. Add a compatible Hugging Face token and provider."});
    const model=process.env.HF_VIDEO_MODEL||"Wan-AI/Wan2.1-T2V-1.3B";
    const r=await fetch(`https://router.huggingface.co/hf-inference/models/${model}`,{method:"POST",headers:{Authorization:`Bearer ${process.env.HF_TOKEN}`,"Content-Type":"application/json",Accept:"video/mp4"},body:JSON.stringify({inputs:prompt})});
    if(!r.ok)return res.status(r.status).json({error:(await r.text()).slice(0,400)});
    res.setHeader("Content-Type",r.headers.get("content-type")||"video/mp4");
    res.send(Buffer.from(await r.arrayBuffer()));
  }catch{res.status(500).json({error:"Video provider request failed."});}
});
const port=process.env.PORT||3000;
app.listen(port,()=>console.log("justanAi API listening on "+port));
