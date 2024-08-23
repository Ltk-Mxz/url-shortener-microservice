require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const dns = require("dns");
const cors = require("cors");
const bodyParser = require("body-parser");
const { URL } = require("url");

const app = express();

// Configuration de base
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const Url = mongoose.model("Url", urlSchema);

app.use(cors());
app.use("/public", express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.post("/api/shorturl", async function (req, res) {
  const original_url = req.body.url;

  try {
    const lookupPromise = new Promise((resolve, reject) => {
      dns.lookup(new URL(original_url).hostname, (err, address) => {
        if (err) {
          reject(err);
        } else {
          resolve(address);
        }
      });
    });

    await lookupPromise;

    const urlCount = await Url.countDocuments({});
    const url = new Url({ original_url, short_url: urlCount + 1 });
    await url.save();
    res.json({ original_url, short_url: url.short_url });
  } catch (error) {
    res.json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:short_url", async function (req, res) {
  const short_url = req.params.short_url;

  try {
    const foundUrl = await Url.findOne({ short_url: short_url });
    if (foundUrl) {
      res.redirect(foundUrl.original_url);
    } else {
      res.json({ error: "No short URL found for the given input" });
    }
  } catch (error) {
    res.json({ error: "Database error" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
  mongoose.connection.on(
    "error",
    console.error.bind(console, "DB connection error:")
  );
  mongoose.connection.once("open", () => {
    console.log("DB Ok!");
  });
});
