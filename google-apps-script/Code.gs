const SHEETS = {
  items: "Items",
  movements: "Movements",
  settings: "Settings",
};

const TYPES = [
  { type: "Flash Disk", prefix: "FD", startCount: 148, nextNumber: 149 },
  { type: "Ses Kayıt Cihazı", prefix: "SR", startCount: 102, nextNumber: 103 },
  { type: "Kamera", prefix: "KM", startCount: 2, nextNumber: 3 },
];

function doGet() {
  setupInventoryWorkbook();
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("İstanbul Bilgi Üniversitesi | Envanter Takibi")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupInventoryWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const items = getOrCreateSheet_(ss, SHEETS.items, [
    "Barcode",
    "Type",
    "Name",
    "Status",
    "Holder",
    "Active",
    "RemovedReason",
    "CreatedAt",
    "UpdatedAt",
  ]);
  const movements = getOrCreateSheet_(ss, SHEETS.movements, [
    "Time",
    "Barcode",
    "ItemName",
    "Action",
    "Person",
    "Note",
  ]);
  const settings = getOrCreateSheet_(ss, SHEETS.settings, ["Type", "Prefix", "NextNumber"]);

  formatSheet_(items);
  formatSheet_(movements);
  formatSheet_(settings);

  if (settings.getLastRow() < 2) {
    settings.getRange(2, 1, TYPES.length, 3).setValues(TYPES.map((entry) => [entry.type, entry.prefix, entry.nextNumber]));
  }

  ensureBaselineInventory_(items);
  ensureMinimumNextNumbers_(settings);
}

function getState() {
  setupInventoryWorkbook();
  return {
    items: readItems_(),
    movements: readMovements_().slice(0, 80),
    nextNumbers: readSettings_(),
  };
}

function scanItem(payload) {
  setupInventoryWorkbook();
  const barcode = normalize_(payload.barcode);
  const person = String(payload.person || "").trim();
  const note = String(payload.note || "").trim();
  const itemsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.items);
  const rows = itemsSheet.getDataRange().getValues();
  const rowIndex = rows.findIndex((row, index) => index > 0 && normalize_(row[0]) === barcode && row[5] === true);

  if (rowIndex === -1) {
    throw new Error("Barkod bulunamadı veya ürün aktif değil.");
  }

  const row = rows[rowIndex];
  const currentStatus = row[3] || "IN";
  const action = currentStatus === "OUT" ? "IN" : "OUT";

  if (action === "OUT" && !person) {
    throw new Error("Çıkış işlemi için teslim alan kişi veya birim girin.");
  }

  const holder = action === "OUT" ? person : "";
  itemsSheet.getRange(rowIndex + 1, 4, 1, 3).setValues([[action, holder, true]]);
  itemsSheet.getRange(rowIndex + 1, 9).setValue(new Date());
  appendMovement_(barcode, row[2], action, person || row[4] || "Hazırlık Programı", note);
  return getState();
}

function addItem(payload) {
  setupInventoryWorkbook();
  const type = String(payload.type || "").trim();
  const customName = String(payload.name || "").trim();
  const settings = readSettings_();
  const typeSetting = TYPES.find((entry) => entry.type === type);

  if (!typeSetting || !settings[typeSetting.prefix]) {
    throw new Error("Ürün türü bulunamadı.");
  }

  const nextNumber = Number(settings[typeSetting.prefix]);
  const barcode = typeSetting.prefix + String(nextNumber).padStart(3, "0");
  const name = customName || `${type} ${nextNumber}`;
  const now = new Date();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheetByName(SHEETS.items).appendRow([barcode, type, name, "IN", "", true, "", now, now]);
  setNextNumber_(typeSetting.prefix, nextNumber + 1);
  appendMovement_(barcode, name, "ADD", "Hazırlık Programı", "Envantere eklendi");
  return getState();
}

function removeItem(payload) {
  setupInventoryWorkbook();
  const barcode = normalize_(payload.barcode);
  const reason = String(payload.reason || "").trim();

  if (!reason) {
    throw new Error("Envanterden çıkarma gerekçesi girin.");
  }

  const itemsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.items);
  const rows = itemsSheet.getDataRange().getValues();
  const rowIndex = rows.findIndex((row, index) => index > 0 && normalize_(row[0]) === barcode && row[5] === true);

  if (rowIndex === -1) {
    throw new Error("Çıkarılacak aktif ürün bulunamadı.");
  }

  const row = rows[rowIndex];
  itemsSheet.getRange(rowIndex + 1, 4, 1, 5).setValues([["REMOVED", "", false, reason, row[7]]]);
  itemsSheet.getRange(rowIndex + 1, 9).setValue(new Date());
  appendMovement_(row[0], row[2], "REMOVE", "Hazırlık Programı", reason);
  return getState();
}

function getNextBarcode(type) {
  setupInventoryWorkbook();
  const typeSetting = TYPES.find((entry) => entry.type === type);
  if (!typeSetting) return "";
  const settings = readSettings_();
  return typeSetting.prefix + String(settings[typeSetting.prefix]).padStart(3, "0");
}

function readItems_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.items);
  return sheet
    .getDataRange()
    .getValues()
    .slice(1)
    .filter((row) => row[5] === true)
    .map((row) => ({
      barcode: row[0],
      type: row[1],
      name: row[2],
      status: row[3],
      holder: row[4],
      updatedAt: row[8] || row[7],
    }));
}

function readMovements_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.movements);
  const values = sheet.getDataRange().getValues().slice(1);
  return values
    .filter((row) => row[0])
    .reverse()
    .map((row) => ({
      time: row[0],
      barcode: row[1],
      itemName: row[2],
      action: row[3],
      person: row[4],
      note: row[5],
    }));
}

function readSettings_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.settings);
  return sheet
    .getDataRange()
    .getValues()
    .slice(1)
    .reduce((acc, row) => {
      acc[row[1]] = Number(row[2]);
      return acc;
    }, {});
}

function setNextNumber_(prefix, nextNumber) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.settings);
  const rows = sheet.getDataRange().getValues();
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[1] === prefix);
  if (rowIndex !== -1) sheet.getRange(rowIndex + 1, 3).setValue(nextNumber);
}

function ensureBaselineInventory_(itemsSheet) {
  const values = itemsSheet.getDataRange().getValues().slice(1);
  const existing = new Set(values.map((row) => normalize_(row[0])));
  const now = new Date();
  const rows = [];

  TYPES.forEach((entry) => {
    for (let i = 1; i <= entry.startCount; i += 1) {
      const barcode = entry.prefix + String(i).padStart(3, "0");
      if (!existing.has(barcode)) {
        rows.push([barcode, entry.type, `${entry.type} ${i}`, "IN", "", true, "", now, now]);
      }
    }
  });

  if (rows.length) {
    itemsSheet.getRange(itemsSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function ensureMinimumNextNumbers_(settingsSheet) {
  const rows = settingsSheet.getDataRange().getValues();
  TYPES.forEach((entry) => {
    const rowIndex = rows.findIndex((row, index) => index > 0 && row[1] === entry.prefix);
    const minimumNextNumber = entry.startCount + 1;
    if (rowIndex === -1) {
      settingsSheet.appendRow([entry.type, entry.prefix, minimumNextNumber]);
      return;
    }
    const currentNextNumber = Number(rows[rowIndex][2]);
    if (!currentNextNumber || currentNextNumber < minimumNextNumber) {
      settingsSheet.getRange(rowIndex + 1, 3).setValue(minimumNextNumber);
    }
  });
}

function appendMovement_(barcode, itemName, action, person, note) {
  SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEETS.movements)
    .appendRow([new Date(), barcode, itemName, action, person, note]);
}

function getOrCreateSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function formatSheet_(sheet) {
  const lastColumn = sheet.getLastColumn();
  sheet.getRange(1, 1, 1, lastColumn).setFontWeight("bold").setBackground("#10231d").setFontColor("#ffffff");
  sheet.autoResizeColumns(1, lastColumn);
}

function normalize_(value) {
  return String(value || "").trim().toLocaleUpperCase("tr-TR");
}
