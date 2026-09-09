import { verifyKey } from "discord-interactions";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  try {
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    const rawBody =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

    const isValid = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return res.status(401).send("Invalid request signature");
    }

    const interaction =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    // Discord PING
    if (interaction.type === 1) {
      return res.status(200).json({
        type: 1,
      });
    }

    // Slash Command
    if (interaction.type === 2) {
      const commandName = interaction.data?.name;

      if (commandName === "ask") {
        const question =
          interaction.data?.options?.find(
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

        const response = await openai.responses.create({
          model: "gpt-5-mini",
          input: question,
        });

        const answer =
          response.output_text || "Maaf, saya tidak mendapatkan jawaban.";

        return res.status(200).json({
          type: 4,
          data: {
            content: answer,
          },
        });
      }
    }

    return res.status(200).json({
      type: 4,
      data: {
        content: "Interaction tidak dikenali.",
      },
    });
  } catch (error) {
    console.error("Error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
}