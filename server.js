require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
require("./passport");

const multer = require("multer");

const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();

app.use(
  session({
    secret: "cloudstorageapp",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));

const upload = multer({
  storage: multer.memoryStorage(),
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Google Login
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google Callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),
  (req, res) => {
    console.log("Authenticated:", req.isAuthenticated());
    console.log(req.user);
    res.redirect("/");
  }
);

// Logout
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// User
app.get("/user", (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user || null,
  });
});

// Login Check
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).send("Please login first.");
}

// Upload
app.post(
  "/upload",
  ensureAuthenticated,
  upload.single("file"),
  async (req, res) => {
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
  }
);

// List Files
app.get("/files", ensureAuthenticated, async (req, res) => {
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

// Share
app.get("/share/:filename", ensureAuthenticated, async (req, res) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: req.params.filename,
    });

    const url = await getSignedUrl(s3, command, {
      expiresIn: 3600,
    });

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).send("Unable to generate share link.");
  }
});

// Download
app.get("/download/:filename", ensureAuthenticated, async (req, res) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: req.params.filename,
    });

    const url = await getSignedUrl(s3, command, {
      expiresIn: 300,
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