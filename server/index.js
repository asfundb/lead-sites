const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const puppeteer = require("puppeteer");
const { analyzeScreenshot } = require("./ai-analysis");
const { generatePDF } = require("./pdf-generator");
const { uploadToFirebase } = require("./firebase-upload");

const app = express();

app.post("/upload", multer().single("file"), async (req, res) => {
  // Process CSV, capture screenshots, analyze, generate PDFs, and upload
});

app.listen(3000, () => console.log("Server running on port 3000"));
