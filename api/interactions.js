export async function POST(req) {
  const body = await req.text();

  console.log("Discord request:", body);

  const interaction = JSON.parse(body);

  if (interaction.type === 1) {
    return Response.json({
      type: 1
    });
  }

  return Response.json({
    type: 4,
    data: {
      content: "Interaction diterima."
    }
  });
}