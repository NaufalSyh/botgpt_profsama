import { verifyKey } from "discord-interactions";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    // Ambil body asli tanpa mengubah format JSON
    const rawBody = await req.text();

    const signature = req.headers.get("x-signature-ed25519");
    const timestamp = req.headers.get("x-signature-timestamp");

    // Verifikasi request dari Discord
    const isValid = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return new Response("Invalid request signature", {
        status: 401,
      });
    }

    const interaction = JSON.parse(rawBody);

    // Discord PING
    if (interaction.type === 1) {
      return Response.json({
        type: 1,
      });
    }

    // Slash Command
    if (interaction.type === 2) {
      const commandName = interaction.data?.name;

      if (commandName === "ask") {
        const question = interaction.data?.options?.find(
          (option) => option.name === "question"
        )?.value;

        if (!question) {
          return Response.json({
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
          response.output_text ||
          "Maaf, saya tidak mendapatkan jawaban.";

        return Response.json({
          type: 4,
          data: {
            content: answer,
          },
        });
      }
    }

    return Response.json({
      type: 4,
      data: {
        content: "Interaction tidak dikenali.",
      },
    });
  } catch (error) {
    console.error("Error:", error);

    return Response.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}