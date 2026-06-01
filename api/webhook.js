const { Telegraf, Markup, session } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing");
}

const bot = new Telegraf(BOT_TOKEN);

bot.use(session());

function getTimesKeyboard() {
  const buttons = [];
  const times = [];

  for (let h = 18; h <= 21; h++) {
    for (let m of [0, 15, 30, 45]) {
      if (h === 21 && m > 0) continue;
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      times.push(time);
    }
  }

  for (let i = 0; i < times.length; i += 2) {
    buttons.push(
      times.slice(i, i + 2).map((time) =>
        Markup.button.callback(time, `time_${time}`)
      )
    );
  }

  return Markup.inlineKeyboard(buttons);
}

bot.start(async (ctx) => {
  ctx.session = {};

  await ctx.reply(
    "Время действовать\n\nНажмите кнопку ниже, чтобы записаться.",
    Markup.inlineKeyboard([
      [Markup.button.callback("Записаться", "booking_start")]
    ])
  );
});

bot.action("booking_start", async (ctx) => {
  ctx.session = {};
  await ctx.answerCbQuery();

  await ctx.reply("Выберите удобное время:", getTimesKeyboard());
});

bot.action(/^time_(.+)$/, async (ctx) => {
  const selectedTime = ctx.match[1];

  ctx.session = {
    step: "name",
    time: selectedTime
  };

  await ctx.answerCbQuery();
  await ctx.reply("Напишите вашу фамилию и имя:");
});

bot.on("text", async (ctx) => {
  if (!ctx.session || !ctx.session.step) {
    await ctx.reply(
      "Чтобы начать запись, нажмите /start и выберите кнопку «Записаться»."
    );
    return;
  }

  const text = ctx.message.text.trim();

  if (ctx.session.step === "name") {
    ctx.session.name = text;
    ctx.session.step = "phone";
    await ctx.reply("Введите ваш номер телефона:");
    return;
  }

  if (ctx.session.step === "phone") {
    ctx.session.phone = text;
    ctx.session.step = "problem";
    await ctx.reply("Кратко опишите вашу проблему:");
    return;
  }

  if (ctx.session.step === "problem") {
    ctx.session.problem = text;

    const user = ctx.from;
    const username = user.username ? `@${user.username}` : "username скрыт";
    const telegramLink = user.username
      ? `https://t.me/${user.username}`
      : `tg://user?id=${user.id}`;

    const applicationText =
`Новая заявка — Время действовать

Время: ${ctx.session.time}
Имя: ${ctx.session.name}
Телефон: ${ctx.session.phone}
Проблема: ${ctx.session.problem}

Telegram: ${username}
Профиль: ${telegramLink}
ID: ${user.id}`;

    if (!GROUP_ID) {
      await ctx.reply("Ошибка: GROUP_ID не указан на сервере.");
      return;
    }

    await ctx.telegram.sendMessage(GROUP_ID, applicationText, {
      disable_web_page_preview: true
    });

    await ctx.reply("Ваша заявка отправлена.");
    ctx.session = {};
  }
});

module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).send("Bot is running");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
};
