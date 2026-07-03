require("dotenv").config();

const express = require("express");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static("public"));

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: req.file.originalname,
      Body: req.file.buffer,
    };

    await s3.send(new PutObjectCommand(params));
    res.send("File uploaded successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed.");
  }
});

app.get("/files", async (req, res) => {
  try {
    const data = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.AWS_BUCKET_NAME,
      })
    );

    res.json(data.Contents || []);
  } catch (err) {
    console.error(err);
    res.status(500).send("Unable to fetch files.");
  }
});
app.get("/share/:filename", async (req, res) => {

    try {

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.params.filename
        });

        const url = await getSignedUrl(s3, command, {
            expiresIn: 3600
        });

        res.json({
            url: url
        });

    } catch (err) {

        console.error(err);

        res.status(500).send("Unable to generate share link.");

    }

});
   app.get("/download/:filename", async (req, res) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.params.filename
        });

        const url = await getSignedUrl(s3, command, {
            expiresIn: 300
        });

        res.json({ url });

    } catch (err) {
        console.error(err);
        res.status(500).send("Unable to generate download link.");
    }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});