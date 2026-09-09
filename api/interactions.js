import { verifyKey } from "discord-interactions";
import OpenAI from "openai";
import { waitUntil } from "@vercel/functions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

// Fungsi latar belakang untuk memproses OpenAI & Webhook Discord
async function handleOpenAIResponse(interaction, promptValue) {
  const appId = process.env.DISCORD_CLIENT_ID;
  const token = interaction.token;
  const webhookUrl = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;
  const username =
    interaction.member?.user?.username ||
    interaction.user?.username ||
    "User";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah Prof Sama, asisten AI yang cerdas dan ramah. Jawab pertanyaan dengan singkat, padat, dan langsung ke intinya.",
        },
        { role: "user", content: promptValue },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const answer =
      response.choices[0]?.message?.content || "Tidak ada respon.";

    // Update pesan "Bot is thinking..." dengan hasil dari OpenAI
    await fetch(webhookUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `> **${username}:** ${promptValue}\n\n🤖 ${answer}`,
      }),
    });
  } catch (error) {
    console.error("OpenAI Error:", error);
    await fetch(webhookUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Maaf, gagal menghubungkan ke AI.",
      }),
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    if (!signature || !timestamp) {
      return res.status(401).json({ error: "Missing Discord signature" });
    }

    const isValid = await verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return res.status(401).send("Invalid request signature");
    }

    const interaction = JSON.parse(rawBody);

    // 1. PING -> PONG
    if (interaction.type === 1) {
      return res.status(200).json({ type: 1 });
    }

    // 2. SLASH COMMANDS
    if (interaction.type === 2) {
      const commandName = interaction.data?.name;

      if (commandName === "prof") {
        const promptValue = interaction.data?.options?.find(
          (opt) => opt.name === "prompt"
        )?.value;

        if (!promptValue) {
          return res.status(200).json({
            type: 4,
            data: { content: "Pertanyaan tidak boleh kosong." },
          });
        }

        // Tahan proses latar belakang Vercel agar tidak dimatikan
        waitUntil(handleOpenAIResponse(interaction, promptValue));

        // Langsung respon Type 5 ke Discord dalam waktu < 0.2 detik
        return res.status(200).json({ type: 5 });
      }
    }

    return res.status(200).json({
      type: 4,
      data: { content: `Interaction '/${interaction.data?.name}' tidak dikenali.` },
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}