const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");

// ─── Config ────────────────────────────────────────────────────────────
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUBSCRIBERS_FILE = path.join(__dirname, "data", "subscribers.json");
const GROUPS_FILE = path.join(__dirname, "public", "data", "groups.json");

const MAIN_DB_URL =
  "https://vikoeif.edupage.org/rpr/server/maindbi.js?__func=mainDBIAccessor";
const CURRENT_URL =
  "https://vikoeif.edupage.org/timetable/server/currenttt.js?__func=curentttGetData";

// In-memory state for multi-step conversations
// { chatId: "awaiting_group" }
const conversationState = {};

// ─── Subscribers helpers ───────────────────────────────────────────────
async function loadSubscribers() {
  try {
    const raw = await fs.readFile(SUBSCRIBERS_FILE, "utf-8");
    return JSON.parse(raw).subscribers || [];
  } catch {
    return [];
  }
}

async function saveSubscribers(subscribers) {
  await fs.writeFile(
    SUBSCRIBERS_FILE,
    JSON.stringify({ subscribers }, null, 2),
    "utf-8"
  );
}

async function getSubscriber(chatId) {
  const list = await loadSubscribers();
  return list.find((s) => s.chatId === chatId) || null;
}

async function upsertSubscriber(chatId, groupShort, groupId, username) {
  const list = await loadSubscribers();
  const idx = list.findIndex((s) => s.chatId === chatId);
  const entry = { chatId, groupShort, groupId, username, subscribedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  await saveSubscribers(list);
}

async function removeSubscriber(chatId) {
  const list = await loadSubscribers();
  await saveSubscribers(list.filter((s) => s.chatId !== chatId));
}

// ─── Groups helpers ────────────────────────────────────────────────────
// In-memory cache so we don't hit EduPage API on every /setgroup
let groupsCache = null;
let groupsCacheTime = 0;
const GROUPS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function loadGroups() {
  // Return cache if fresh
  if (groupsCache && Date.now() - groupsCacheTime < GROUPS_CACHE_TTL) {
    return groupsCache;
  }

  // Try local file first (works in dev and if file exists on server)
  try {
    const raw = await fs.readFile(GROUPS_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0) {
      groupsCache = data;
      groupsCacheTime = Date.now();
      return groupsCache;
    }
  } catch {
    // file missing or empty — fall through to API
  }

  // Fetch groups directly from EduPage API
  try {
    const today = moment().format("YYYY-MM-DD");
    const res = await axios.post(
      MAIN_DB_URL,
      {
        __args: [
          null,
          2025,
          { vt_filter: { datefrom: today, dateto: today } },
          {
            op: "fetch",
            needed_part: {
              classes: ["id", "short", "name"],
            },
            needed_combos: {},
          },
        ],
        __gsh: "00000000",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const tables = res.data?.r?.tables || [];
    // Find the classes table (groups have 2+ letter prefix + 2-digit year)
    const classTable = tables.find((t) =>
      (t?.data_rows || []).some((r) => /^[A-Z]{2,}\d{2}/.test(r.short || ""))
    );
    const groups = classTable?.data_rows || [];

    if (groups.length > 0) {
      groupsCache = groups;
      groupsCacheTime = Date.now();
      // Also save to local file for next time
      await fs.writeFile(GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8").catch(() => {});
    }
    return groups;
  } catch (err) {
    console.error("Failed to fetch groups from EduPage:", err.message);
    return [];
  }
}

async function findGroup(input) {
  const groups = await loadGroups();
  const query = input.trim().toUpperCase();
  return (
    groups.find((g) => g.short?.toUpperCase() === query) || null
  );
}

// ─── Timetable fetching ────────────────────────────────────────────────
function buildAllPayload(dateFrom, dateTo) {
  return {
    __args: [
      null,
      2025,
      { vt_filter: { datefrom: dateFrom, dateto: dateTo } },
      {
        op: "fetch",
        needed_part: {
          teachers:   ["id", "short", "name", "firstname", "lastname"],
          classes:    ["id", "short", "name"],
          classrooms: ["id", "short", "name"],
          subjects:   ["id", "short", "name"],
        },
        needed_combos: {},
      },
    ],
    __gsh: "00000000",
  };
}

function buildCurrentPayload(dateFrom, dateTo, groupId) {
  return {
    __args: [
      null,
      {
        year: 2025,
        datefrom: dateFrom,
        dateto: dateTo,
        table: "classes",
        id: groupId,
        showColors: true,
        showIgroupsInClasses: false,
        showOrig: true,
        log_module: "CurrentTTView",
      },
    ],
    __gsh: "00000000",
  };
}

async function fetchSchedule(groupId, date) {
  const dateStr = moment(date).format("YYYY-MM-DD");

  const [allRes, currentRes] = await Promise.all([
    axios.post(MAIN_DB_URL, buildAllPayload(dateStr, dateStr), {
      headers: { "Content-Type": "application/json" },
    }),
    axios.post(CURRENT_URL, buildCurrentPayload(dateStr, dateStr, groupId), {
      headers: { "Content-Type": "application/json" },
    }),
  ]);

  const tables = allRes.data?.r?.tables || [];
  const ttitems = currentRes.data?.r?.ttitems || [];

  // Identify tables by content — API may return them in any order
  const rows = (t) => t?.data_rows || [];

  const teacherTable   = tables.find((t) => rows(t).some((r) => "firstname" in r));
  const groupTable     = tables.find((t) => t !== teacherTable && rows(t).some((r) => /^[A-Z]{2,}\d{2}/.test(r.short || "")));
  const classroomTable = tables.find((t) => t !== teacherTable && t !== groupTable && rows(t).every((r) => !(r.name || "").includes(" ")) && rows(t).some((r) => /^[A-Z]\d+/.test(r.short || "")));
  const subjectTable   = tables.find((t) => t !== teacherTable && t !== groupTable && t !== classroomTable);

  // Coerce IDs to strings — EduPage mixes number/string types across endpoints
  const subjectMap   = new Map(rows(subjectTable).map((s)  => [String(s.id), s]));
  const classroomMap = new Map(rows(classroomTable).map((c) => [String(c.id), c]));
  const teacherMap   = new Map(rows(teacherTable).map((t)   => [String(t.id), t]));

  return ttitems.map((lec) => {
    const sid = String(lec.subjectid ?? "");
    const cid = String(lec.classroomids?.[0] ?? lec.classroomid ?? "");
    const tid = String(lec.teacherids?.[0]   ?? lec.teacherid   ?? "");
    const teacher = teacherMap.get(tid);
    const teacherName =
      [teacher?.firstname, teacher?.lastname].filter(Boolean).join(" ") ||
      teacher?.short || "–";

    return {
      period: lec.uniperiod,
      subject:
        subjectMap.get(sid)?.name ||
        subjectMap.get(sid)?.short ||
        "Unknown",
      classroom: classroomMap.get(cid)?.short || "–",
      teacher: teacherName,
      starttime: lec.starttime,
      endtime: lec.endtime,
      subgroup: lec.groupnames?.[0] || null,
      changed: lec.changed || false,
    };
  });
}

// ─── Message formatting ────────────────────────────────────────────────
const PERIOD_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];

function formatScheduleMessage(lectures, date, groupShort) {
  const day = moment(date);
  const isToday = day.isSame(moment(), "day");
  const isTomorrow = day.isSame(moment().add(1, "day"), "day");

  const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : day.format("dddd");
  const header = `📅 *${dayLabel}, ${day.format("MMMM D")}* — Group *${groupShort}*\n`;

  if (lectures.length === 0) {
    return (
      header +
      "\n✅ No classes! Enjoy your free day 🎉"
    );
  }

  const lines = lectures.map((lec, i) => {
    const emoji = PERIOD_EMOJI[lec.period - 1] || `${lec.period}.`;
    const changed = lec.changed ? " ⚠️ _Changed_" : "";
    const subgroup = lec.subgroup ? ` \\[${lec.subgroup}\\]` : "";

    return (
      `\n${emoji} *${lec.subject}*${subgroup}${changed}\n` +
      `   🕐 ${lec.starttime} – ${lec.endtime}\n` +
      `   🏛 Room ${lec.classroom}   👤 ${lec.teacher}`
    );
  });

  return header + lines.join("\n") + "\n\n🎓 _Good luck today!_";
}

// ─── Group picker keyboard ─────────────────────────────────────────────
async function sendGroupPicker(bot, chatId, messageText) {
  const groups = await loadGroups();

  if (groups.length === 0) {
    // Fallback to text input if groups couldn't be loaded
    conversationState[chatId] = "awaiting_group";
    return bot.sendMessage(
      chatId,
      `${messageText}\n\n📝 Type your group name (e.g. *PI24E*, *EI23A*):`,
      { parse_mode: "Markdown" }
    );
  }

  // Build inline keyboard — 3 buttons per row
  const buttons = groups.map((g) => ({
    text: g.short,
    callback_data: `setgroup:${g.short}:${g.id}`,
  }));

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 3) {
    keyboard.push(buttons.slice(i, i + 3));
  }

  return bot.sendMessage(chatId, messageText, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });
}

// ─── Bot setup ─────────────────────────────────────────────────────────
function startBot() {
  if (!TOKEN) {
    console.warn(
      "⚠️  TELEGRAM_BOT_TOKEN not set — Telegram bot will not start."
    );
    return;
  }

  const bot = new TelegramBot(TOKEN, { polling: true });
  console.log("🤖 Telegram bot started");

  // ── /start ─────────────────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || "there";
    const subscriber = await getSubscriber(chatId);

    if (subscriber) {
      return bot.sendMessage(
        chatId,
        `👋 Welcome back, *${firstName}!*\n\nYour current group: *${subscriber.groupShort}*\n\n/today — Today's schedule\n/tomorrow — Tomorrow's schedule\n/setgroup — Change group\n/stop — Stop notifications`,
        { parse_mode: "Markdown" }
      );
    }

    // New user — show group picker immediately
    await sendGroupPicker(
      bot,
      chatId,
      `👋 Hi *${firstName}!* Welcome to *VIKO EIF Timetable Bot* 🎓\n\nEvery evening at *7:00 PM* you'll get tomorrow's schedule so you can prepare the night before.\n\n👇 *Select your study group:*`
    );
  });

  // ── /setgroup ──────────────────────────────────────────────────────
  bot.onText(/\/setgroup(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const inline = match[1]?.trim();

    if (inline) {
      await handleGroupInput(bot, chatId, inline, msg.from?.username);
    } else {
      await sendGroupPicker(
        bot,
        chatId,
        "🔄 *Change your group*\n\n👇 Select your study group:"
      );
    }
  });

  // ── Inline keyboard callback (group selection) ─────────────────────
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (!data?.startsWith("setgroup:")) return;

    const [, groupShort, groupId] = data.split(":");
    const username = query.from?.username;

    // Acknowledge the button tap immediately
    await bot.answerCallbackQuery(query.id);

    // Remove the keyboard from the original message
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: query.message.message_id }
    ).catch(() => {});

    delete conversationState[chatId];
    await upsertSubscriber(chatId, groupShort, groupId, username);

    bot.sendMessage(
      chatId,
      `✅ *Group set to ${groupShort}!*\n\nYou'll receive tomorrow's schedule every evening at *7:00 PM* 📬\n\n/today — Today's schedule\n/tomorrow — Tomorrow's schedule\n/week — This week overview`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /today ─────────────────────────────────────────────────────────
  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    const subscriber = await getSubscriber(chatId);

    if (!subscriber) {
      return bot.sendMessage(chatId, "❗ Please set your group first with /setgroup");
    }

    const loading = await bot.sendMessage(chatId, "⏳ Fetching your schedule...");
    try {
      const lectures = await fetchSchedule(subscriber.groupId, moment());
      const text = formatScheduleMessage(lectures, moment(), subscriber.groupShort);
      await bot.deleteMessage(chatId, loading.message_id);
      bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } catch (err) {
      await bot.deleteMessage(chatId, loading.message_id);
      bot.sendMessage(chatId, "❌ Failed to fetch schedule. Please try again.");
      console.error("Error fetching today schedule:", err.message);
    }
  });

  // ── /tomorrow ──────────────────────────────────────────────────────
  bot.onText(/\/tomorrow/, async (msg) => {
    const chatId = msg.chat.id;
    const subscriber = await getSubscriber(chatId);

    if (!subscriber) {
      return bot.sendMessage(chatId, "❗ Please set your group first with /setgroup");
    }

    const tomorrow = moment().add(1, "day");
    const loading = await bot.sendMessage(chatId, "⏳ Fetching tomorrow's schedule...");
    try {
      const lectures = await fetchSchedule(subscriber.groupId, tomorrow);
      const text = formatScheduleMessage(lectures, tomorrow, subscriber.groupShort);
      await bot.deleteMessage(chatId, loading.message_id);
      bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } catch (err) {
      await bot.deleteMessage(chatId, loading.message_id);
      bot.sendMessage(chatId, "❌ Failed to fetch schedule. Please try again.");
      console.error("Error fetching tomorrow schedule:", err.message);
    }
  });

  // ── /week ──────────────────────────────────────────────────────────
  bot.onText(/\/week/, async (msg) => {
    const chatId = msg.chat.id;
    const subscriber = await getSubscriber(chatId);

    if (!subscriber) {
      return bot.sendMessage(chatId, "❗ Please set your group first with /setgroup");
    }

    const loading = await bot.sendMessage(chatId, "⏳ Fetching this week's schedule...");

    try {
      // Fetch Mon–Fri of current week
      const monday = moment().startOf("isoWeek");
      const days = [0, 1, 2, 3, 4].map((d) => monday.clone().add(d, "days"));

      const results = await Promise.all(
        days.map((d) => fetchSchedule(subscriber.groupId, d))
      );

      const lines = days.map((d, i) => {
        const lecs = results[i];
        const dayName = d.format("ddd DD/MM");
        if (lecs.length === 0) return `\n📅 *${dayName}* — No classes ✅`;
        const summary = lecs
          .map((l) => `   • ${l.starttime} ${l.subject}`)
          .join("\n");
        return `\n📅 *${dayName}* \\(${lecs.length} class${lecs.length !== 1 ? "es" : ""}\\)\n${summary}`;
      });

      await bot.deleteMessage(chatId, loading.message_id);
      bot.sendMessage(
        chatId,
        `📆 *Week schedule — ${subscriber.groupShort}*\n` + lines.join("\n"),
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      await bot.deleteMessage(chatId, loading.message_id);
      bot.sendMessage(chatId, "❌ Failed to fetch weekly schedule.");
      console.error("Error fetching week schedule:", err.message);
    }
  });

  // ── /stop ──────────────────────────────────────────────────────────
  bot.onText(/\/stop/, async (msg) => {
    const chatId = msg.chat.id;
    await removeSubscriber(chatId);
    delete conversationState[chatId];
    bot.sendMessage(
      chatId,
      "👋 You've been unsubscribed. You won't receive daily notifications.\n\nSend /start anytime to subscribe again."
    );
  });

  // ── /help ──────────────────────────────────────────────────────────
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `🤖 *VIKO EIF Timetable Bot*\n\nAvailable commands:\n\n/today — Today's class schedule\n/tomorrow — Tomorrow's schedule\n/week — Full week overview\n/setgroup — Change your group\n/stop — Stop daily notifications\n/help — Show this message\n\n📬 Every evening at *7:00 PM* you'll receive tomorrow's schedule so you can prepare the night before.`,
      { parse_mode: "Markdown" }
    );
  });

  // ── Handle free-text (group name input) ────────────────────────────
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text || msg.text.startsWith("/")) return;
    if (conversationState[chatId] !== "awaiting_group") return;

    await handleGroupInput(bot, chatId, msg.text.trim(), msg.from?.username);
  });

  // ── Daily cron — 7:00 PM Vilnius time (Mon–Fri) ───────────────────
  // Sends TOMORROW's schedule so students can prepare the night before
  // Europe/Vilnius is UTC+2 (winter) / UTC+3 (summer)
  cron.schedule(
    "0 19 * * 1-5",
    async () => {
      console.log(`[${new Date().toISOString()}] Running daily schedule notifications...`);
      const subscribers = await loadSubscribers();

      if (subscribers.length === 0) {
        console.log("No subscribers yet.");
        return;
      }

      const tomorrow = moment().add(1, "day");
      const dateStr = tomorrow.format("YYYY-MM-DD");

      // Group subscribers by groupId to avoid duplicate API calls
      const groupMap = new Map();
      for (const sub of subscribers) {
        if (!groupMap.has(sub.groupId)) groupMap.set(sub.groupId, []);
        groupMap.get(sub.groupId).push(sub);
      }

      for (const [groupId, subs] of groupMap.entries()) {
        try {
          const lectures = await fetchSchedule(groupId, tomorrow);
          const groupShort = subs[0].groupShort;
          const text = formatScheduleMessage(lectures, tomorrow, groupShort);

          const greeting =
            lectures.length === 0
              ? `🌙 *Good evening!* No classes tomorrow — enjoy your free day! 😊`
              : `🌙 *Good evening!* Here's your schedule for *tomorrow* — get ready! 📚`;

          for (const sub of subs) {
            try {
              await bot.sendMessage(sub.chatId, `${greeting}\n\n${text}`, {
                parse_mode: "Markdown",
              });
            } catch (err) {
              // User probably blocked the bot — remove them
              if (
                err.response?.body?.error_code === 403 ||
                err.response?.body?.error_code === 400
              ) {
                console.log(`Removing blocked subscriber: ${sub.chatId}`);
                await removeSubscriber(sub.chatId);
              }
            }
          }

          // Small delay between groups to be nice to the API
          await new Promise((r) => setTimeout(r, 1000));
        } catch (err) {
          console.error(
            `Error sending notifications for group ${groupId}:`,
            err.message
          );
        }
      }

      console.log(`Notifications sent to ${subscribers.length} subscriber(s).`);
    },
    { timezone: "Europe/Vilnius" }
  );

  console.log("⏰ Daily cron scheduled: 7:00 PM Vilnius time, Mon–Fri (sends tomorrow's schedule)");
  return bot;
}

// ─── Group input handler (reused by /setgroup and free text) ──────────
async function handleGroupInput(bot, chatId, input, username) {
  const group = await findGroup(input);

  if (!group) {
    // Show a few real group examples from the loaded list
    const allGroups = await loadGroups();
    const examples = allGroups.slice(0, 5).map((g) => `*${g.short}*`).join(", ");
    const hint = examples ? `\n\nAvailable examples: ${examples}` : "";

    return bot.sendMessage(
      chatId,
      `❌ Group *${input.toUpperCase()}* not found.\n\nPlease check the group name and try again. Group names look like *PI24E*, *EI23A*, *IS24*.${hint}`,
      { parse_mode: "Markdown" }
    );
  }

  delete conversationState[chatId];
  await upsertSubscriber(chatId, group.short, group.id, username);

  bot.sendMessage(
    chatId,
    `✅ Group set to *${group.short}*!\n\nYou'll now receive tomorrow's schedule every evening at *7:00 PM* 📬\n\nTry it now:\n/today — Today's schedule\n/tomorrow — Tomorrow's schedule\n/week — This week overview`,
    { parse_mode: "Markdown" }
  );
}

module.exports = { startBot };
