import { verifyKey } from "discord-interactions";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
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
    const rawBody = await getRawBody(req);

    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    const isValid = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      console.log("Invalid Discord signature");

      return res.status(401).send("Invalid request signature");
    }

    const interaction = JSON.parse(rawBody);

    console.log("Interaction received:", interaction.type);

    // Discord PING
    if (interaction.type === 1) {
      console.log("PING received → PONG");

      return res.status(200).json({
        type: 1,
      });
    }

    return res.status(200).json({
      type: 4,
      data: {
        content: "Interaction diterima!",
      },
    });
  } catch (error) {
    console.error("ERROR:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
}