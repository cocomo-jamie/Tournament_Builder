// src/components/RosterDropBox.jsx
// ─────────────────────────────────────────────────────────
// File drop box for team roster upload (.csv/.xlsx), plus a downloadable
// blank template. Parses client-side via rosterParser and hands parsed
// rows + warnings up to the caller — it does not render or own an
// editable table itself (that's Phase 3's job per
// FEATURE_SPEC_team_roster_registration.md) and it never submits
// anything on its own.
// ─────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useEvent } from "../context/EventContext";
import { parseRosterFile, rosterTemplateCsv } from "../utils/rosterParser";

function downloadTemplate() {
  const blob = new Blob([rosterTemplateCsv()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roster-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {number} [maxPlayers] - event's playersMax, used for the parse-time overcount warning
 * @param {(rows: Array, fileWarning: string|null, fileName: string) => void} onParsed
 */
export default function RosterDropBox({ maxPlayers, onParsed }) {
  const { config: C } = useEvent();
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [lastFileName, setLastFileName] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const { rows, fileWarning } = await parseRosterFile(file, { maxPlayers });
      setLastFileName(file.name);
      onParsed(rows, fileWarning, file.name);
    } catch (err) {
      console.error("Roster file parse failed:", err);
      setParseError("Couldn't read that file. Make sure it's a .csv or .xlsx spreadsheet.");
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? C.brand.accent : "#ffffff20"}`,
          background: dragActive ? `${C.brand.accent}10` : "#ffffff04",
          borderRadius: 14,
          padding: "28px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Upload size={22} color={C.brand.accent} style={{ marginBottom: 8 }} />
        <p className="fb" style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
          {parsing ? "Reading file..." : "Drop your roster spreadsheet here, or click to browse"}
        </p>
        <p className="fb" style={{ fontSize: 11, color: "#ffffff50" }}>
          .csv or .xlsx — needs name / email / phone columns
        </p>
        {lastFileName && !parsing && (
          <p className="fb" style={{ fontSize: 11, color: C.brand.accent, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <FileSpreadsheet size={11} /> {lastFileName}
          </p>
        )}
      </div>

      {parseError && (
        <p className="fb" style={{ fontSize: 12, color: "#ef4444", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertCircle size={13} /> {parseError}
        </p>
      )}

      <button
        type="button"
        onClick={downloadTemplate}
        className="fb"
        style={{
          marginTop: 10, fontSize: 12, fontWeight: 600, color: "#ffffff70",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <Download size={12} /> Download blank template (.csv)
      </button>
    </div>
  );
}
