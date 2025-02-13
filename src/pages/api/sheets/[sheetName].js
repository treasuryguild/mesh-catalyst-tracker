// pages/api/sheets/[sheetName].js
import { google } from 'googleapis';

export default async function handler(req, res) {
  const { sheetName } = req.query;

  if (!sheetName) {
    return res.status(400).json({ error: 'Sheet name is required' });
  }

  try {
    let auth;

    // Option 1: Use the GOOGLE_APPLICATION_CREDENTIALS environment variable.
    // This should point to the file path of your JSON key.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    }
    // Option 2: Use a JSON string provided in an environment variable.
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    } else {
      throw new Error('No Google Application Credentials provided');
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID; // Set your spreadsheet ID in env variables

    // Define the range – here we're reading columns A to Z. Adjust as needed.
    const range = `${sheetName}!A:Z`;

    // Fetch the sheet data using the Google Sheets API
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No data found' });
    }

    // Convert the rows into JSON using the first row as headers
    const headers = rows[0];
    const jsonData = rows.slice(1).map((row) => {
      const rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header] = row[index];
      });
      return rowObject;
    });

    return res.status(200).json({ status: 'success', data: jsonData });
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
