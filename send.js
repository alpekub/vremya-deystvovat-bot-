module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const GROUP_ID = process.env.GROUP_ID;

  const { time, name, phone, problem } = req.body;

  const text =
`Новая заявка — Время действовать

Время: ${time}
Имя: ${name}
Телефон: ${phone}
Проблема: ${problem}`;

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: GROUP_ID,
        text: text
      })
    }
  );

  const result = await response.json();

  return res.status(200).json(result);
};
