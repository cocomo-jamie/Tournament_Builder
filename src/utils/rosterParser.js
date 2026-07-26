// src/utils/rosterParser.js
// ─────────────────────────────────────────────────────────
// Client-side .csv/.xlsx roster parsing (SheetJS). Pure parsing +
// parse-time validation only — no submission logic, no editable-table
// state. That's Phase 3 (FEATURE_SPEC_team_roster_registration.md).
// ─────────────────────────────────────────────────────────

import * as XLSX from "xlsx";

const HEADER_KEYS = ["name", "email", "phone"];

function cellToString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Parse a dropped .csv/.xlsx File into roster rows.
 *
 * Header matching is case-insensitive and order-independent — only exact
 * "name" / "email" / "phone" headers (after trim + lowercase) are
 * recognized, matching the downloadable template exactly.
 *
 * @param {File} file
 * @param {{ maxPlayers?: number }} [opts]
 * @returns {Promise<{ rows: Array<{name: string, email: string, phone: string, warnings: string[]}>, fileWarning: string|null }>}
 */
export async function parseRosterFile(file, { maxPlayers } = {}) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // header: 1 → array-of-arrays, so we control header matching ourselves
  // rather than trusting SheetJS's own object-key casing/whitespace.
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (grid.length === 0) {
    return { rows: [], fileWarning: "That file appears to be empty." };
  }

  const colIndex = { name: -1, email: -1, phone: -1 };
  grid[0].forEach((cell, i) => {
    const key = cellToString(cell).toLowerCase();
    if (HEADER_KEYS.includes(key) && colIndex[key] === -1) colIndex[key] = i;
  });

  if (colIndex.name === -1 && colIndex.email === -1 && colIndex.phone === -1) {
    return {
      rows: [],
      fileWarning: "Couldn't find name, email, or phone columns — check the file has a header row matching the template.",
    };
  }

  const rows = grid
    .slice(1)
    // Drop fully-blank rows (common artifact of trailing blank lines/rows
    // in a spreadsheet export) rather than turning them into empty entries.
    .filter((r) => r.some((cell) => cellToString(cell) !== ""))
    .map((r) => {
      const name = colIndex.name !== -1 ? cellToString(r[colIndex.name]) : "";
      const email = colIndex.email !== -1 ? cellToString(r[colIndex.email]) : "";
      const phone = colIndex.phone !== -1 ? cellToString(r[colIndex.phone]) : "";
      const warnings = [];
      if (!name) warnings.push("missing_name");
      if (!email) warnings.push("missing_email");
      return { name, email, phone, warnings };
    });

  let fileWarning = null;
  if (maxPlayers != null && rows.length > maxPlayers) {
    fileWarning = `This file has ${rows.length} players, which is more than this event's max roster size (${maxPlayers}). You can still submit — the extra players will need admin review.`;
  }

  return { rows, fileWarning };
}

/** Downloadable blank template matching the exact headers parseRosterFile looks for. */
export function rosterTemplateCsv() {
  return "name,email,phone\n";
}
