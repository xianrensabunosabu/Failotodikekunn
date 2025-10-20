const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const port = process.env.PORT || 3000;
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// Renderなどクラウドでも動作可能に
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// ファイルアップロード処理
app.post("/upload", upload.single("file"), async (req, res) => {
  const id = Date.now().toString(36);
  const filename = req.file.originalname;
  const filepath = path.join(__dirname, "uploads", req.file.filename);

  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://${getLocalIP()}:${port}`;
  const downloadUrl = `${baseUrl}/download/${id}`;
  const qr = await QRCode.toDataURL(downloadUrl);

  fs.writeFileSync(`uploads/${id}.json`, JSON.stringify({ filepath, filename }));

  res.json({ downloadUrl, qr });
});

// ダウンロード
app.get("/download/:id", (req, res) => {
  const metaFile = `uploads/${req.params.id}.json`;
  if (!fs.existsSync(metaFile)) return res.status(404).send("ファイルが見つかりません。");

  const { filepath, filename } = JSON.parse(fs.readFileSync(metaFile));
  res.download(filepath, filename, (err) => {
    if (!err) {
      fs.unlinkSync(filepath);
      fs.unlinkSync(metaFile);
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 ファイルお届け便 稼働中: http://localhost:${port}`);
});
