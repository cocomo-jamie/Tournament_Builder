// src/utils/rosterParser.js
// ─────────────────────────────────────────────────────────
// Client-side .csv/.xlsx roster parsing (SheetJS). Pure parsing +
// parse-time validation only — role assignment, the review UI, and
// submission are all owned by TeamRosterSection.jsx
// (FEATURE_SPEC_team_roster_registration.md).
// ─────────────────────────────────────────────────────────

import * as XLSX from "xlsx";

// name/email are soft-required (missing → warning); phone/shirt_size/
// dietary_needs are genuinely optional — absent entirely is not a warning.
const REQUIRED_KEYS = ["name", "email"];
const OPTIONAL_KEYS = ["phone", "shirt_size", "dietary_needs"];
const ALL_KEYS = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

function cellToString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Parse a dropped .csv/.xlsx File into roster rows.
 *
 * Header matching is case-insensitive and order-independent — exact
 * "name" / "email" / "phone" / "shirt_size" / "dietary_needs" headers
 * (after trim + lowercase) are recognized, matching the downloadable
 * template exactly.
 *
 * @param {File} file
 * @param {{ maxPlayers?: number }} [opts]
 * @returns {Promise<{
 *   rows: Array<{name: string, email: string, phone: string, shirt_size: string, dietary_needs: string, warnings: string[]}>,
 *   fileWarnings: string[]
 * }>}
 */
export async function parseRosterFile(file, { maxPlayers } = {}) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // header: 1 → array-of-arrays, so we control header matching ourselves
  // rather than trusting SheetJS's own object-key casing/whitespace.
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (grid.length === 0) {
    return { rows: [], fileWarnings: ["That file appears to be empty."] };
  }

  const colIndex = { name: -1, email: -1, phone: -1, shirt_size: -1, dietary_needs: -1 };
  grid[0].forEach((cell, i) => {
    const key = cellToString(cell).toLowerCase();
    if (ALL_KEYS.includes(key) && colIndex[key] === -1) colIndex[key] = i;
  });

  const foundAny = ALL_KEYS.some((k) => colIndex[k] !== -1);
  if (!foundAny) {
    return {
      rows: [],
      fileWarnings: ["Couldn't find name, email, or phone columns — check the file has a header row matching the template."],
    };
  }

  // Specific, actionable guidance per missing required column — this is
  // what replaces the old "silent wall of per-row missing_email flags"
  // for a typo'd header: tell the captain which column didn't match,
  // once, at the file level, instead of flagging every row.
  const fileWarnings = [];
  REQUIRED_KEYS.forEach((key) => {
    if (colIndex[key] === -1) {
      fileWarnings.push(`We couldn't find a column matching "${key}" — check your file's headers match the template.`);
    }
  });

  const rows = grid
    .slice(1)
    // Drop fully-blank rows (common artifact of trailing blank lines/rows
    // in a spreadsheet export) rather than turning them into empty entries.
    .filter((r) => r.some((cell) => cellToString(cell) !== ""))
    .map((r) => {
      const get = (key) => (colIndex[key] !== -1 ? cellToString(r[colIndex[key]]) : "");
      const name = get("name");
      const email = get("email");
      const warnings = [];
      // Only flag a row for a required field if that field's column
      // actually exists in the file — if the whole column is missing,
      // the file-level warning above already explains why, once.
      if (colIndex.name !== -1 && !name) warnings.push("missing_name");
      if (colIndex.email !== -1 && !email) warnings.push("missing_email");
      return {
        name,
        email,
        phone: get("phone"),
        shirt_size: get("shirt_size"),
        dietary_needs: get("dietary_needs"),
        warnings,
      };
    });

  if (maxPlayers != null && rows.length > maxPlayers) {
    fileWarnings.push(
      `This file has ${rows.length} players, which is more than this event's max roster size (${maxPlayers}). You can still submit — the extra players will need admin review.`
    );
  }

  return { rows, fileWarnings };
}

/** Downloadable blank template matching the exact headers parseRosterFile looks for. */
export function rosterTemplateCsv() {
  return "name,email,phone,shirt_size,dietary_needs\n";
}
