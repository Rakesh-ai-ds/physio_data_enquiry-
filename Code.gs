/**
 * Prasad Physio Therapy - Google Apps Script Backend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default code with this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone"
 * 8. Click "Deploy" and copy the Web App URL
 * 9. Paste the URL in your app.js file (APPS_SCRIPT_URL constant)
 * 
 * SHEET STRUCTURE (Create headers in Row 1):
 * A1: S.No
 * B1: Date
 * C1: Patient Name
 * D1: Gender
 * E1: Address
 * F1: Phone
 * G1: Referral Source
 * H1: Notes
 */

// Sheet configuration
const SHEET_NAME = 'Patients';
const SPREADSHEET_ID = '1anSvGy6Cg5FOXyTLoF7ySW9PthGe6l3Cn6mGNapudaY'; // Your Google Sheet ID

/**
 * Initialize the sheet with headers if needed
 */
function initSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Add headers
    const headers = ['S.No', 'Date', 'Patient Name', 'Gender', 'Address', 'Phone', 'Referral Source', 'Notes'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

/**
 * Handle GET requests - Fetch all records
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAll';
    
    if (action === 'getAll') {
      const records = getAllRecords();
      return createJsonResponse({ success: true, records: records });
    }
    
    return createJsonResponse({ success: false, error: 'Invalid action' });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

/**
 * Handle POST requests - Add or Update records
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'add') {
      const result = addRecord(data.data);
      return createJsonResponse({ success: true, sno: result.sno });
    }
    
    if (action === 'update') {
      const result = updateRecord(data.sno, data.data);
      return createJsonResponse({ success: result.success, message: result.message });
    }
    
    return createJsonResponse({ success: false, error: 'Invalid action' });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

/**
 * Get all patient records
 */
function getAllRecords() {
  const sheet = initSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return []; // No data, only headers
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  const records = data.map(row => ({
    sno: row[0],
    date: formatSheetDate(row[1]),
    name: row[2],
    gender: row[3],
    address: row[4],
    phone: row[5],
    referralSource: row[6],
    notes: row[7]
  }));
  
  return records.filter(r => r.sno); // Filter out empty rows
}

/**
 * Add a new patient record
 */
function addRecord(patientData) {
  const sheet = initSheet();
  const lastRow = sheet.getLastRow();
  
  // Generate new S.No
  let newSno = 1;
  if (lastRow > 1) {
    const lastSno = sheet.getRange(lastRow, 1).getValue();
    newSno = (parseInt(lastSno) || 0) + 1;
  }
  
  // Prepare row data
  const rowData = [
    newSno,
    patientData.date,
    patientData.name,
    patientData.gender,
    patientData.address,
    patientData.phone,
    patientData.referralSource || '',
    patientData.notes || ''
  ];
  
  // Append to sheet
  sheet.appendRow(rowData);
  
  return { success: true, sno: newSno };
}

/**
 * Update an existing patient record by S.No
 * This updates the existing row, not creating a new one
 */
function updateRecord(sno, patientData) {
  const sheet = initSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return { success: false, message: 'No records found' };
  }
  
  // Find the row with matching S.No
  const snoColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  
  for (let i = 0; i < snoColumn.length; i++) {
    if (parseInt(snoColumn[i][0]) === parseInt(sno)) {
      rowIndex = i + 2; // +2 because array is 0-indexed and we skip header row
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, message: 'Record not found' };
  }
  
  // Update the row (keeping the same S.No)
  const rowData = [
    parseInt(sno), // Keep original S.No
    patientData.date,
    patientData.name,
    patientData.gender,
    patientData.address,
    patientData.phone,
    patientData.referralSource || '',
    patientData.notes || ''
  ];
  
  sheet.getRange(rowIndex, 1, 1, 8).setValues([rowData]);
  
  return { success: true, message: 'Record updated successfully' };
}

/**
 * Delete a patient record by S.No
 */
function deleteRecord(sno) {
  const sheet = initSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return { success: false, message: 'No records found' };
  }
  
  // Find the row with matching S.No
  const snoColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  
  for (let i = 0; i < snoColumn.length; i++) {
    if (parseInt(snoColumn[i][0]) === parseInt(sno)) {
      rowIndex = i + 2;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, message: 'Record not found' };
  }
  
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: 'Record deleted successfully' };
}

/**
 * Format date from sheet to YYYY-MM-DD
 */
function formatSheetDate(date) {
  if (!date) return '';
  
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return String(date);
}

/**
 * Create JSON response
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function - Run this to verify sheet setup
 */
function testSetup() {
  const sheet = initSheet();
  Logger.log('Sheet initialized: ' + sheet.getName());
  Logger.log('Last row: ' + sheet.getLastRow());
  
  // Test get all records
  const records = getAllRecords();
  Logger.log('Records count: ' + records.length);
  Logger.log('Records: ' + JSON.stringify(records));
}
