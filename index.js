import { Client, GatewayIntentBits, Collection } from "discord.js";
import express from "express";
import fs from "fs";

// ==== LOAD DATA ====
let db = JSON.parse(fs.readFileSync("./database.json", "utf8"));

// ==== BOT ====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ======= SAVE FUNCTION =======
function saveDB() {
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));
}

// ======= MINERAL TABLE =======
const MINERALS = [
  { name: "Stone", value: 2, chance: 60 },
  { name: "Coal", value: 5, chance: 20 },
  { name: "Iron", value: 10, chance: 10 },
  { name: "Diamond", value: 50, chance: 5 },
  { name: "Volt Crystal", value: 200, chance: 1 }
];

// ======= PICKAXE TABLE =======
const PICKAXE = {
  1: { name: "Wooden Pickaxe", power: 1, price: 100 },
  2: { name: "Stone Pickaxe", power: 2, price: 250 },
  3: { name: "Iron Pickaxe", power: 3, price: 500 },
  4: { name: "Diamond Pickaxe", power: 5, price: 1200 },
  5: { name: "Volt Pickaxe", power: 10, price: 3000 }
};

// ==== SHOP RESTOCK TIMER ====
let shopAvailable = true;
setInterval(() => {
  shopAvailable = true;
  console.log("[RESTOCK] Pickaxe restocked!");
}, 60 * 60 * 1000); // 1 jam

// ==== REGISTER USER ====
function reg(u) {
  if (!db[u]) {
    db[u] = {
      voltcoin: 0,
      pickaxe: 1,
      backpack: [],
      backpackSize: 20,
      afk: false,
      afkStart: 0
    };
  }
}

// ======= RANDOM MINERAL =======
function randomMineral() {
  let r = Math.random() * 100;
  let total = 0;
  for (let m of MINERALS) {
    total += m.chance;
    if (r <= total) return m;
  }
  return MINERALS[0];
}

// =============================================
//           COMMAND HANDLER
// =============================================

client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  const id = i.user.id;
  reg(id);

  // ======================
  //       /mine
  // ======================
  if (i.commandName === "mine") {
    const user = db[id];
    if (user.backpack.length >= user.backpackSize)
      return i.reply("Backpackmu penuh!");

    const mineral = randomMineral();
    const amount = mineral.value * user.pickaxe;

    user.backpack.push({
      item: mineral.name,
      worth: mineral.value
    });

    saveDB();

    return i.reply(
      `⛏️ Kamu menambang **${mineral.name}**!\n` +
      `Pickaxe Power: ${PICKAXE[user.pickaxe].power}\n` +
      `Backpack: ${user.backpack.length}/${user.backpackSize}`
    );
  }

  // ======================
  //       /sell
  // ======================
  if (i.commandName === "sell") {
    const row = i.options.getInteger("row") - 1;
    const user = db[id];

    if (!user.backpack[row])
      return i.reply("Row tidak valid!");

    const value = user.backpack[row].worth;

    user.voltcoin += value;
    user.backpack.splice(row, 1);

    saveDB();
    return i.reply(`Berhasil menjual item seharga **${value} VoltCoin**!`);
  }

  // ======================
  //       /sellall
  // ======================
  if (i.commandName === "sellall") {
    const user = db[id];
    let total = 0;

    for (let m of user.backpack) {
      total += m.worth;
    }

    user.backpack = [];
    user.voltcoin += total;

    saveDB();
    return i.reply(`Semua mineral terjual! Kamu mendapatkan **${total} VoltCoin**`);
  }

  // ======================
  //       /afk
  // ======================
  if (i.commandName === "afk") {
    const user = db[id];

    if (!user.afk) {
      user.afk = true;
      user.afkStart = Date.now();
      saveDB();
      return i.reply("Kamu sekarang AFK. Bot akan menambang otomatis.");
    } else {
      user.afk = false;
      const hours = Math.floor((Date.now() - user.afkStart) / 3600000);
      let mined = Math.min(hours * 3, user.backpackSize - user.backpack.length);

      // Autofill
      for (let x = 0; x < mined; x++) {
        user.backpack.push(randomMineral());
      }

      saveDB();
      return i.reply(
        `AFK dihentikan.\nKamu menambang **${mined} mineral** secara otomatis.`
      );
    }
  }

  // ======================
  //      /backpack
  // ======================
  if (i.commandName === "backpack") {
    const user = db[id];

    let list = user.backpack
      .map((m, idx) => `${idx + 1}. ${m.item} (${m.worth})`)
      .join("\n");

    if (list.length == 0) list = "Backpack kosong.";

    return i.reply(
      `🎒 **Backpack (${user.backpack.length}/${user.backpackSize})**\n` +
      "```\n" + list + "```"
    );
  }

  // ======================
  //      /upgrade (shop)
  // ======================
  if (i.commandName === "upgrade") {
    if (!shopAvailable)
      return i.reply("Shop belum restock!");

    const user = db[id];

    if (user.pickaxe >= 5)
      return i.reply("Pickaxemu sudah max!");

    const next = user.pickaxe + 1;
    const cost = PICKAXE[next].price * 2;

    if (user.voltcoin < cost)
      return i.reply(`Kamu butuh ${cost} VoltCoin.`);

    user.voltcoin -= cost;
    user.pickaxe = next;
    shopAvailable = false;

    saveDB();
    return i.reply(`Pickaxe berhasil di-upgrade menjadi **${PICKAXE[next].name}**!`);
  }

  // ======================
  //      /anner (anvil miner)
  // ======================
  if (i.commandName === "anner") {
    const user = db[id];

    if (user.pickaxe >= 5)
      return i.reply("Pickaxemu sudah max!");

    const next = user.pickaxe + 1;
    const cost = PICKAXE[next].price;

    if (user.voltcoin < cost)
      return i.reply(`Kamu butuh ${cost} VoltCoin.`);

    user.voltcoin -= cost;
    user.pickaxe = next;

    saveDB();
    return i.reply(`Pickaxe berhasil di-upgrade via ANNER menjadi **${PICKAXE[next].name}**!`);
  }

});

// LOGIN
client.login(process.env.TOKEN);
console.log("Bot starting...");
