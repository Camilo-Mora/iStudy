/**
 * iStudy Diagnostic Backend v2.8 - GEO302/SUST314
 */

const PROF_EMAIL = "mora@hawaii.edu";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "requestOTP") {
      return requestOTP(data.email);
    } else if (action === "verifyOTP") {
      return verifyOTP(data.email, data.otp);
    } else if (action === "getStatus") {
      return getStatus(data.email);
    } else if (action === "registerCompletion") {
      return registerCompletion(data.email, data.chapter, data.uniqueCode, data.reportContent, data.finalGrade);
    } else if (action === "registerVideoPortfolio") {
      return registerVideoPortfolio(data.email, data.finalGrade, data.videos);
    }

    return response({ status: "error", message: "Invalid action: " + action });
  } catch (err) {
    return response({ status: "error", message: "System Error: " + err.toString() });
  }
}

function getStatus(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const completionData = getCompletionStatus(ss, email);
  return response({ status: "success", completion: completionData, email: email });
}

function requestOTP(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Students") || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const emailIdx = headers.indexOf("email");

  if (emailIdx === -1) return response({ status: "error", message: "Missing 'Email' column. Headers: " + headers.join(",") });

  const student = data.find(row => row[emailIdx] && row[emailIdx].toString().toLowerCase().trim() === email.toLowerCase().trim());

  if (!student) {
    return response({ status: "not_found", message: "Email not found in roster." });
  }

  const otp = Math.floor(100 + Math.random() * 900).toString();
  const otpSheet = ss.getSheetByName("OTP") || ss.insertSheet("OTP");
  otpSheet.appendRow([email, otp, new Date()]);

  try {
    MailApp.sendEmail({
      to: email,
      subject: "iStudy Verification Code",
      body: "Your verification code for iStudy is: " + otp
    });
  } catch (e) {
    // Hidden fail
  }

  return response({ status: "success", message: "OTP generated." });
}

function verifyOTP(email, otp) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const otpSheet = ss.getSheetByName("OTP");
  if (!otpSheet) return response({ status: "error", message: "No OTP data." });

  const data = otpSheet.getDataRange().getValues();
  const reversedData = data.slice().reverse();
  const match = reversedData.find(row =>
    row[0] && row[0].toString().toLowerCase().trim() === email.toLowerCase().trim() &&
    row[1] && row[1].toString() === otp.toString()
  );

  if (match) {
    const completionData = getCompletionStatus(ss, email);
    return response({ status: "success", completion: completionData, student_email: email });
  }

  return response({ status: "invalid", message: "Invalid code." });
}

function getCompletionStatus(ss, email) {
  const sheet = ss.getSheetByName("Students") || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().trim());
  const emailIdx = headers.findIndex(h => h.toLowerCase().trim() === "email");

  if (emailIdx === -1) return {};

  const row = data.find(r => r[emailIdx] && r[emailIdx].toString().toLowerCase().trim() === email.toLowerCase().trim());
  if (!row) return {};

  const status = {};
  headers.forEach((h, i) => {
    const lowerH = h.toLowerCase();
    if (lowerH.includes("chapter") || lowerH.includes("video")) {
      status[h] = row[i];
    }
  });
  return status;
}

function registerCompletion(email, chapter, uniqueCode, reportContent, finalGrade) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Students") || ss.getSheets()[0];
  const dataValues = sheet.getDataRange().getValues();
  const headers = dataValues[0].map(h => h.toString().trim());

  const emailIdx = headers.findIndex(h => h.toLowerCase().trim() === "email");
  
  // Prioritize exact match for FinalGrade to avoid getting caught by "Grade 01", etc.
  let gradeIdx = headers.findIndex(h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === "finalgrade");
  if (gradeIdx === -1) {
    gradeIdx = headers.findIndex(h => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean === "grade" || clean.includes("finalgrade") || clean.includes("grad");
    });
  }

  const chNum = parseInt(chapter.toString().replace(/[^0-9]/g, ''));
  const padded = (chNum < 10 ? "0" : "") + chNum;

  let chapterIdx = headers.findIndex(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === "chapter" + chNum || clean === "chapter" + padded;
  });

  const rowIndex = dataValues.findIndex(row => row[emailIdx] && row[emailIdx].toString().toLowerCase().trim() === email.toLowerCase().trim());

  if (rowIndex === -1) return response({ status: "error", message: "Student '" + email + "' not found. Headers found: " + headers.join(",") });
  if (chapterIdx === -1) return response({ status: "error", message: "Column not found for Chapter " + chapter + ". Headers found: " + headers.join(",") });

  // 1. Update unique code
  sheet.getRange(rowIndex + 1, chapterIdx + 1).setValue(uniqueCode);

  // 2. Update Grade
  let gradeUpdateStatus = "skipped";
  if (gradeIdx !== -1 && finalGrade) {
    sheet.getRange(rowIndex + 1, gradeIdx + 1).setValue(finalGrade);
    gradeUpdateStatus = "updated to " + finalGrade;
  }

  // 3. Send Email (Switch to MailApp for consistency)
  let emailStatus = "pending";
  try {
    const subject = "GEO302/SUST314 Completion confirmation chapter " + chapter;
    const body = "Attached is your report for chapter" + chapter + ". If you choose to take the final exam videos, this file attached should be your study source. If you did submit your Q&A report in IStudy honestly, this file attached has the best  resposes for you to study; further when delivering those videos you will be  asked to load these resports, so it is important that you keep a copy of the atatched file.";
    const blob = Utilities.newBlob(reportContent, "text/plain", "Report_Ch_" + padded + ".txt");

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body,
      attachments: [blob],
      cc: PROF_EMAIL
    });
    emailStatus = "sent";
  } catch (emailErr) {
    emailStatus = "failed: " + emailErr.toString();
  }

  return response({
    status: "success",
    uniqueCode: uniqueCode,
    diagnostics: {
      gradeColumnIndex: gradeIdx,
      gradeUpdateStatus: gradeUpdateStatus,
      emailStatus: emailStatus,
      allHeaders: headers
    }
  });
}

function registerVideoPortfolio(email, finalGrade, videos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Students") || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().trim());
  const emailIdx = headers.findIndex(h => h.toLowerCase().trim() === "email");
  
  // Prioritize exact match for FinalGrade to avoid getting caught by "Grade 01", etc.
  let gradeIdx = headers.findIndex(h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === "finalgrade");
  if (gradeIdx === -1) {
    gradeIdx = headers.findIndex(h => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean === "grade" || clean.includes("finalgrade") || clean.includes("grad");
    });
  }

  const rowIndex = data.findIndex(row => row[emailIdx] && row[emailIdx].toString().toLowerCase().trim() === email.toLowerCase().trim());
  if (rowIndex === -1) return response({ status: "error", message: "Student not found." });

  const studentRow = data[rowIndex];
  let verifiedCount = 0;

  videos.forEach(v => {
    // 1. Verify Completion Code from Sheet
    const padded = v.chapter.toString().padStart(2, '0');
    const chColIdx = headers.findIndex(h => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean === "chapter" + padded || clean === "chapter" + v.chapter.toString();
    });
    
    if (chColIdx !== -1) {
      const storedValue = studentRow[chColIdx];
      if (!storedValue || storedValue.toString().trim() !== v.code.trim()) {
        console.warn(`Code mismatch for ${email} Chapter ${v.chapter}. Provided: ${v.code}, Stored: ${storedValue}`);
        return; // Skip this video if code is invalid
      }
    }

    // 2. If valid or if chapter column not found (should be found), save URL
    const colIdx = headers.findIndex(h => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean === "video" + v.chapter || clean === "video" + padded;
    });
    
    if (colIdx !== -1) {
      sheet.getRange(rowIndex + 1, colIdx + 1).setValue(v.url);
      verifiedCount++;
    }
  });

  if (verifiedCount === 0 && videos.length > 0) {
    return response({ status: "error", message: "Verification failed: None of the provided completion codes matched our records." });
  }

  if (gradeIdx !== -1) sheet.getRange(rowIndex + 1, gradeIdx + 1).setValue(finalGrade);

  try {
    MailApp.sendEmail({
      to: email,
      subject: "GEO302 Video Received",
      body: "Grade: " + finalGrade,
      cc: PROF_EMAIL
    });
  } catch (e) { }

  return response({ status: "success", grade: finalGrade });
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
