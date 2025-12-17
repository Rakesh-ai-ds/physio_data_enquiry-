/**
 * Prasad Physio Therapy - Google Apps Script Backend
 * 
 * SETUP: Deploy as Web App with "Execute as: Me" and "Who has access: Anyone"
 */

const SHEET_NAME = 'Patients';
const SPREADSHEET_ID = '1anSvGy6Cg5FOXyTLoF7ySW9PthGe6l3Cn6mGNapudaY';

function initSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['S.No', 'Date', 'Patient Name', 'Gender', 'Address', 'Phone', 'Referral Source', 'Notes'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Handle all requests via GET (for CORS compatibility)
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAll';
    
    // GET ALL RECORDS
    if (action === 'getAll') {
      const records = getAllRecords();
      return createJsonResponse({ success: true, records: records });
    }
    
    // ADD NEW RECORD
    if (action === 'add') {
      const patientData = {
        date: e.parameter.date || '',
        name: e.parameter.name || '',
        gender: e.parameter.gender || '',
        address: e.parameter.address || '',
        phone: e.parameter.phone || '',
        referralSource: e.parameter.referralSource || '',
        notes: e.parameter.notes || ''
      };
      
      const result = addRecord(patientData);
      return createJsonResponse({ success: true, sno: result.sno });
    }
    
    // UPDATE EXISTING RECORD
    if (action === 'update') {
      const sno = e.parameter.sno;
      const patientData = {
        date: e.parameter.date || '',
        name: e.parameter.name || '',
        gender: e.parameter.gender || '',
        address: e.parameter.address || '',
        phone: e.parameter.phone || '',
        referralSource: e.parameter.referralSource || '',
        notes: e.parameter.notes || ''
      };
      
      const result = updateRecord(sno, patientData);
      return createJsonResponse(result);
    }
    
    return createJsonResponse({ success: false, error: 'Invalid action' });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

/**
 * Handle POST requests (backup method)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'add') {
      const result = addRecord(data.data);
      return createJsonResponse({ success: true, sno: result.sno });
    }
    
    if (data.action === 'update') {
      const result = updateRecord(data.sno, data.data);
      return createJsonResponse(result);
    }
    
    return createJsonResponse({ success: false, error: 'Invalid action' });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

function getAllRecords() {
  const sheet = initSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  return data.map(row => ({
    sno: row[0],
    date: formatSheetDate(row[1]),
    name: row[2],
    gender: row[3],
    address: row[4],
    phone: String(row[5]),
    referralSource: row[6],
    notes: row[7]
  })).filter(r => r.sno);
}

function addRecord(patientData) {
  const sheet = initSheet();
  const lastRow = sheet.getLastRow();
  
  let newSno = 1;
  if (lastRow > 1) {
    const lastSno = sheet.getRange(lastRow, 1).getValue();
    newSno = (parseInt(lastSno) || 0) + 1;
  }
  
  sheet.appendRow([
    newSno,
    patientData.date,
    patientData.name,
    patientData.gender,
    patientData.address,
    patientData.phone,
    patientData.referralSource || '',
    patientData.notes || ''
  ]);
  
  return { success: true, sno: newSno };
}

function updateRecord(sno, patientData) {
  const sheet = initSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return { success: false, message: 'No records found' };
  }
  
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
  
  sheet.getRange(rowIndex, 1, 1, 8).setValues([[
    parseInt(sno),
    patientData.date,
    patientData.name,
    patientData.gender,
    patientData.address,
    patientData.phone,
    patientData.referralSource || '',
    patientData.notes || ''
  ]]);
  
  return { success: true, message: 'Record updated successfully' };
}

function formatSheetDate(date) {
  if (!date) return '';
  if (date instanceof Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return String(date);
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
