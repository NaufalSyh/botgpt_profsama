const applicationId = process.env.DISCORD_APPLICATION_ID;

const command = {
  name: "ask",
  description: "Tanyakan sesuatu kepada AI",
  options: [
    {
      name: "question",
      description: "Pertanyaan yang ingin ditanyakan",
      type: 3,
      required: true,
    },
  ],
};

console.log("Application ID:", applicationId);
console.log("Command:", JSON.stringify(command, null, 2));