/**
 * iStudy Diagnostic Backend v3.0 - GEO302/SUST314
 * 
 * Features:
 * - In-memory OTP handling via CacheService (Zero sheet disk storage for codes)
 * - SHA-256 Hashed Roster verification (Zero readable student emails in the database)
 * - Server-side Gemini AI proxy with cached API key
 * - Direct email dispatch for Q&A reports and Exam Video Portfolios
 * - 1-Click Roster Anonymizer tool (converts plain emails to cryptographic hashes)
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("iStudy Tools")
      .addItem("🔒 Anonymize Roster (Emails -> Hashes)", "anonymizeRoster")
      .addToUi();
  } catch (e) {
    // Menu fail-safe when running in non-UI contexts
  }
}

/**
 * Handles incoming GET requests (health check / browser pings).
 */
function doGet(e) {
  return response({ status: "active", message: "iStudy Backend is running" });
}

/**
 * Main API Router for POST requests from the web app.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "requestOTP") {
      return requestOTP(data.email);
    } else if (action === "verifyOTP") {
      return verifyOTP(data.email, data.otp);
    } else if (action === "proxyGemini") {
      return proxyGemini(data.model, data.promptText);
    } else if (action === "submitReportEmail" || action === "registerCompletion") {
      return submitReportEmail(data.email, data.chapter, data.uniqueCode, data.reportContent);
    } else if (action === "submitVideoPortfolioEmail") {
      return submitVideoPortfolioEmail(data.email, data.videos);
    }

    return response({ status: "error", message: "Invalid action: " + action });
  } catch (err) {
    return response({ status: "error", message: "System Error: " + err.toString() });
  }
}

/**
 * Retrieves the Gemini API key from cell A1 of the API_Key sheet.
 * Caches in memory for 6 hours (21600s) for ultra-fast AI responses.
 */
function getCachedApiKey() {
  const cache = CacheService.getScriptCache();
  let apiKey = cache.get("GEMINI_API_KEY");
  if (apiKey && apiKey.length >= 10) {
    return apiKey;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  const apiKeySheet = allSheets.find(s => {
    const name = s.getName().toLowerCase().replace(/[^a-z0-9]/g, '');
    return name === "apikey" || name.includes("apikey");
  }) || ss.getSheetByName("API_Key");

  if (!apiKeySheet) {
    throw new Error("API_Key sheet not found. Please create a sheet named 'API_Key' with your key in cell A1.");
  }

  apiKey = apiKeySheet.getRange("A1").getValue().toString().trim();
  if (!apiKey || apiKey.length < 10) {
    throw new Error("API key in cell A1 of sheet '" + apiKeySheet.getName() + "' is empty or invalid.");
  }

  cache.put("GEMINI_API_KEY", apiKey, 21600);
  return apiKey;
}

/**
 * Proxies AI generateContent calls server-side.
 */
function proxyGemini(model, promptText) {
  try {
    const apiKey = getCachedApiKey();
    const targetModel = model || "gemini-3.1-flash-lite";
    const cleanModel = targetModel.includes('/') ? targetModel : ("models/" + targetModel);
    const url = "https://generativelanguage.googleapis.com/v1beta/" + cleanModel + ":generateContent?key=" + apiKey;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(res.getContentText());

    if (json.error && (json.error.code === 400 || json.error.code === 403) && json.error.message && json.error.message.toLowerCase().includes("api_key")) {
      CacheService.getScriptCache().remove("GEMINI_API_KEY");
    }

    return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return response({ error: { message: "proxyGemini error: " + err.toString() } });
  }
}

/**
 * Checks student registration against the SHA-256 Hashed roster.
 * Generates a 3-digit OTP and caches it in memory for 10 minutes (Zero sheet disk storage).
 */
function requestOTP(email) {
  if (!email || !email.includes("@")) {
    return response({ status: "not_found", message: "Please enter a valid student email." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const inputHash = computeSha256(cleanEmail);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Roster") || ss.getSheetByName("Students") || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  // Check Column A for either matching SHA-256 hash or plain email fallback
  let isAuthorized = false;
  for (let i = 0; i < data.length; i++) {
    const val = (data[i][0] || "").toString().trim().toLowerCase();
    if (val === inputHash || val === cleanEmail) {
      isAuthorized = true;
      break;
    }
  }

  if (!isAuthorized) {
    return response({ status: "not_found", message: "Email not found in class roster." });
  }

  // Generate 3-digit verification code
  const otp = Math.floor(100 + Math.random() * 900).toString();

  // Store in memory cache for 60 minutes (3600 seconds) — Auto-expires, zero sheet writes
  CacheService.getScriptCache().put("OTP_" + cleanEmail, otp, 3600);

  try {
    MailApp.sendEmail({
      to: cleanEmail,
      subject: "iStudy Verification Code",
      body: "Your verification code for iStudy is: " + otp + "\n\nThis code will expire in 60 minutes."
    });
  } catch (e) {
    // Fail-safe if email dispatch fails
  }

  return response({ status: "success", message: "OTP generated." });
}

/**
 * Verifies the 3-digit OTP from CacheService in memory.
 */
function verifyOTP(email, otp) {
  if (!email || !otp) {
    return response({ status: "invalid", message: "Missing email or code." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = otp.toString().trim();

  const cachedOtp = CacheService.getScriptCache().get("OTP_" + cleanEmail);

  if (cachedOtp && cachedOtp === cleanOtp) {
    // Remove OTP from cache so it cannot be reused
    CacheService.getScriptCache().remove("OTP_" + cleanEmail);
    return response({ status: "success", student_email: cleanEmail });
  }

  return response({ status: "invalid", message: "Invalid or expired verification code." });
}

/**
 * Dispatches completed Q&A report to instructor and student copy.
 */
function submitReportEmail(email, chapter, uniqueCode, reportContent) {
  try {
    const chNum = parseInt(chapter.toString().replace(/[^0-9]/g, ''));
    const padded = (chNum < 10 ? "0" : "") + chNum;
    const instructorEmail = "cmora@hawaii.edu";
    const blob = Utilities.newBlob(reportContent, "text/plain", "Report_Ch_" + padded + "_" + email.replace(/[^a-zA-Z0-9]/g, '_') + ".txt");

    // 1. Send Completion Notification + Attachment to Instructor
    const instructorSubject = "[iStudy Completion] Chapter " + chapter + " - " + email;
    const instructorBody =
      "iStudy Chapter Completion Report\n" +
      "---------------------------------\n" +
      "Student: " + email + "\n" +
      "Chapter: " + chapter + "\n" +
      "Completion Code: " + uniqueCode + "\n" +
      "Timestamp: " + new Date().toISOString() + "\n\n" +
      "Attached is the student's completed response report.";

    MailApp.sendEmail({
      to: instructorEmail,
      subject: instructorSubject,
      body: instructorBody,
      attachments: [blob]
    });

    // 2. Send student confirmation copy with study material
    try {
      const studentSubject = "GEO302/SUST314 | Chapter " + chapter + " Report Attached";
      const studentHtml =
        "<div style=\"font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;\">" +
        "<p>Attached is your Chapter " + chapter + " report.</p>" +
        "<p>This document attached is your <strong>Primary Study Source</strong> for the final exam, if you choose to take it.</p>" +
        "<p><strong>Note on Integrity:</strong> If you have submitted your Q&A session <strong>honestly</strong>, this report contains your best, most polished responses. If you rushed the process, your study resource for the final will be compromised.</p>" +
        "<p>Furthermore, if you choose to take the final video exams, you will be required to upload these files, so please ensure you keep a copy of this file.</p>" +
        "<p><strong>Your Verification Code:</strong> " + uniqueCode + "</p>" +
        "<p style=\"margin-top: 30px; font-size: 13px; color: #777;\">iStudy Diagnostic System</p>" +
        "</div>";

      MailApp.sendEmail({
        to: email,
        subject: studentSubject,
        htmlBody: studentHtml,
        attachments: [blob]
      });
    } catch (studentMailErr) {
      // Non-blocking
    }

    return response({
      status: "success",
      message: "Report sent successfully to instructor and student.",
      uniqueCode: uniqueCode
    });
  } catch (err) {
    return response({ status: "error", message: "Failed to dispatch email: " + err.toString() });
  }
}

/**
 * Dispatches Exam Video Portfolio links to instructor and student copy.
 */
function submitVideoPortfolioEmail(email, videos) {
  try {
    const instructorEmail = "cmora@hawaii.edu";
    const videoList = Array.isArray(videos) ? videos : [];
    const totalVideos = videoList.length;

    // 1. Send Structured Email to Instructor
    const instructorSubject = "[iStudy Video Portfolio] - " + email;
    let instructorBody =
      "iStudy Exam Video Portfolio Submission\n" +
      "--------------------------------------\n" +
      "STUDENT: " + email + "\n" +
      "TIMESTAMP: " + new Date().toISOString() + "\n" +
      "TOTAL_VIDEOS: " + totalVideos + "\n\n" +
      "--- SUBMITTED VIDEOS ---\n";

    videoList.forEach(v => {
      const chNum = (v.chapter || "").toString().padStart(2, '0');
      instructorBody += "CH:" + chNum + " | CODE:" + (v.code || "NONE") + " | URL:" + (v.url || "") + "\n";
    });

    MailApp.sendEmail({
      to: instructorEmail,
      subject: instructorSubject,
      body: instructorBody
    });

    // 2. Send Receipt to Student (no letter grades mentioned)
    try {
      const studentSubject = "GEO302/SUST314 Final Video Exams Received";
      const chapterNumbers = videoList.map(v => "Chapter " + parseInt(v.chapter || 0)).join(", ");

      let studentHtml =
        "<div style=\"font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;\">" +
        "<p>Aloha,</p>" +
        "<p>I have received your <strong>" + totalVideos + "</strong> exam videos for: <strong>" + chapterNumbers + "</strong>.</p>" +
        "<p>I will review your responses and only contact you if any of your videos require correction.</p>" +
        "<p>Below is a copy of your submitted exam video links for your records:</p>" +
        "<ul>";

      videoList.forEach(v => {
        const ch = parseInt(v.chapter || 0);
        studentHtml += "<li><strong>Chapter " + ch + ":</strong> <a href=\"" + v.url + "\" target=\"_blank\">" + v.url + "</a></li>";
      });

      studentHtml +=
        "</ul>" +
        "<p style=\"margin-top: 30px; font-size: 13px; color: #777;\">iStudy Diagnostic System</p>" +
        "</div>";

      MailApp.sendEmail({
        to: email,
        subject: studentSubject,
        htmlBody: studentHtml
      });
    } catch (studentErr) {
      // Non-blocking
    }

    return response({
      status: "success",
      message: "Portfolio submitted successfully to instructor and student."
    });
  } catch (err) {
    return response({ status: "error", message: "Failed to dispatch portfolio: " + err.toString() });
  }
}

/**
 * Computes a standard SHA-256 hex string from text.
 */
function computeSha256(text) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  let hex = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    hex += byteHex;
  }
  return hex.toLowerCase();
}

/**
 * 1-CLICK ROSTER ANONYMIZER TOOL
 * Run this function (or click 'iStudy Tools -> Anonymize Roster' in Google Sheets)
 * to convert any plain email addresses in Column A into SHA-256 cryptographic hashes.
 */
function anonymizeRoster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Roster") || ss.getSheetByName("Students") || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return "Sheet is empty.";

  let convertedCount = 0;
  const newValues = data.map((row, index) => {
    const val = (row[0] || "").toString().trim();
    if (!val) return [""];
    
    // Preserve header label in row 1
    if (index === 0 && (val.toLowerCase() === "email" || val.toLowerCase() === "hash" || val.toLowerCase() === "roster" || val.toLowerCase() === "student email")) {
      return ["Roster_SHA256_Hashes"];
    }

    // If it is a plain email, convert to SHA-256 hash
    if (val.includes("@")) {
      convertedCount++;
      return [computeSha256(val.toLowerCase().trim())];
    }

    // If already hashed (64 hex characters), leave as is
    return [val];
  });

  sheet.getRange(1, 1, newValues.length, 1).setValues(newValues);
  SpreadsheetApp.flush();
  
  const msg = "✅ Anonymization Complete: Converted " + convertedCount + " email(s) into SHA-256 hashes.";
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log(msg);
  }
  return msg;
}

/**
 * JSON Response helper
 */
function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
