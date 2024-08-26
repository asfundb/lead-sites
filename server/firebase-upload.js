const admin = require("firebase-admin");

admin.initializeApp({
  // Firebase configuration
});

async function uploadToFirebase(pdfBuffer, leadId) {
  // Upload PDF to Firebase Storage
  // Return download URL
}

module.exports = { uploadToFirebase };
