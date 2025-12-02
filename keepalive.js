import express from "express";
const app = express();

app.all("/", (req, res) => {
  res.send("VoltMiner Bot is Alive");
});

app.listen(3000, () => {
  console.log("KeepAlive server online");
});
