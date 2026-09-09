// register.js
const CLIENT_ID = "MASUKKAN_CLIENT_ID_KAMU";
const BOT_TOKEN = "MASUKKAN_BOT_TOKEN_KAMU";

const commandData = {
  name: "prof",
  description: "Tanya sesuatu ke Prof Sama",
  options: [
    {
      name: "question",
      description: "Pertanyaan yang ingin kamu ajukan ke Prof Sama",
      type: 3, // Type 3 = STRING
      required: true,
    },
  ],
};

async function registerCommands() {
  console.log("Mendaftarkan Slash Command ke Discord...");

  try {
    const response = await fetch(
      `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commandData),
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Berhasil! Command /ask sudah terdaftar secara Global.");
      console.log("ID Command:", data.id);
    } else {
      console.error("❌ Gagal mendaftarkan command:", data);
    }
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  }
}

registerCommands();