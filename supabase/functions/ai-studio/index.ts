// Re.Wise AI Studio - Central Supabase Edge Function
// Model: gemini-2.5-flash-lite
// Features: Server-side Gemini API key, 5/day Free Quota Enforcement, Atomic Card Generation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_INSTRUCTION = `You are an elite competitive exam spaced repetition tutor (NEET PG, USMLE, UPSC CSE, STEM).
Convert the user's study material into atomic flashcards adhering strictly to the Minimum Information Principle:
1. Every card must test exactly ONE isolated memory item or fact. Never bundle multi-sentence lists on one card.
2. Card types:
   - "basic": Clean question in "front", concise direct answer in "back".
   - "cloze": Natural sentence with ONE blank using {{c1::hidden answer}} syntax in "front" and the answer revealed in "back".
3. Provide high-yield memory aids, mnemonics, or textbook pearls in "extraContext".
4. Add 1-3 short high-yield topic tags (e.g. ["Pharmacology", "Autonomic"]).
Return a JSON array of objects conforming to:
[{ "cardType": "basic" | "cloze", "front": string, "back": string, "extraContext": string, "tags": string[] }]`;

const DAILY_FREE_LIMIT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Server GEMINI_API_KEY is not configured in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate user via JWT if present
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let userId: string | null = null;
    let isPro = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("is_pro")
          .eq("id", userId)
          .single();
        if (profile?.is_pro) isPro = true;
      }
    }

    // 2. Daily Quota Check (bypass for Pro users)
    const today = new Date().toISOString().slice(0, 10);
    let usedToday = 0;

    if (userId && !isPro) {
      const { data: usage } = await supabaseAdmin
        .from("ai_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .maybeSingle();

      usedToday = usage?.count || 0;
      if (usedToday >= DAILY_FREE_LIMIT) {
        return new Response(
          JSON.stringify({
            error: `Daily AI limit reached (${usedToday}/${DAILY_FREE_LIMIT}). Upgrade to Pro or provide a custom Gemini API key.`,
            usedToday,
            dailyLimit: DAILY_FREE_LIMIT,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Parse Request Payload
    const body = await req.json();
    const { text, imageBase64, mimeType, cardStyle, targetSubject } = body;

    if (!text && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "No text or image provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Assemble Gemini Request
    const promptText = `Subject context: ${targetSubject || "General Revision"}.
Preferred style: ${cardStyle || "mixed"}.
Input study material:\n${text || "Extract flashcards from the attached diagram/page."}`;

    const parts: any[] = [{ text: promptText }];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    // Call Gemini 2.5 Flash Lite
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Gemini API returned ${geminiRes.status}: ${errText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      return new Response(
        JSON.stringify({ error: "No content generated by Gemini." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedCards: any[] = [];
    try {
      parsedCards = JSON.parse(textOutput);
    } catch {
      const match = textOutput.match(/\[[\s\S]*\]/);
      if (match) parsedCards = JSON.parse(match[0]);
    }

    // 5. Update Usage in Database if authenticated
    if (userId && !isPro) {
      await supabaseAdmin.from("ai_usage").upsert(
        {
          user_id: userId,
          usage_date: today,
          count: usedToday + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,usage_date" }
      );
    }

    return new Response(
      JSON.stringify({
        cards: parsedCards,
        usedToday: usedToday + 1,
        dailyLimit: DAILY_FREE_LIMIT,
        isPro,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
