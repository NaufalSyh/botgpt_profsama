import { verifyKey } from "discord-interactions";
import OpenAI from "openai";

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
    chunks.push(
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  try {
    // Ambil raw body asli untuk verifikasi Discord
    const rawBody = await getRawBody(req);

    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    if (!signature || !timestamp) {
      return res.status(401).json({
        error: "Missing Discord signature",
      });
    }

    // Verifikasi request Discord
    const isValid = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return res.status(401).send("Invalid request signature");
    }

    const interaction = JSON.parse(rawBody);

    // =========================
    // DISCORD PING → PONG
    // =========================
    if (interaction.type === 1) {
      console.log("PING received → PONG");

      return res.status(200).json({
        type: 1,
      });
    }

    // =========================
    // SLASH COMMAND
    // =========================
    if (interaction.type === 2) {
      const commandName = interaction.data?.name;

      if (commandName === "ask") {
        const question = interaction.data?.options?.find(
          (option) => option.name === "question"
        )?.value;

        if (!question) {
          return res.status(200).json({
            type: 4,
            data: {
              content: "Pertanyaan tidak boleh kosong.",
            },
          });
        }

        try {
          const response = await openai.responses.create({
            model: "gpt-5-mini",
            input: question,
          });

          const answer =
            response.output_text ||
            "Maaf, saya tidak mendapatkan jawaban.";

          return res.status(200).json({
            type: 4,
            data: {
              content: answer,
            },
          });
        } catch (error) {
          console.error("OpenAI Error:", error);

          return res.status(200).json({
            type: 4,
            data: {
              content:
                "Maaf, terjadi kesalahan saat menghubungi AI.",
            },
          });
        }
      }
    }

    return res.status(200).json({
      type: 4,
      data: {
        content: "Interaction tidak dikenali.",
      },
    });
  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
}