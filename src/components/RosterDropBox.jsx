// src/components/RosterDropBox.jsx
// ─────────────────────────────────────────────────────────
// File drop box for team roster upload (.csv/.xlsx), plus a downloadable
// blank template and a remove/replace control. Parses client-side via
// rosterParser and hands parsed rows + warnings up to the caller — it
// does not render role assignment or an editable table itself (that's
// TeamRosterSection's job per FEATURE_SPEC_team_roster_registration.md)
// and it never submits anything on its own.
// ─────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, X } from "lucide-react";
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
 * @param {(rows: Array, fileWarnings: string[], fileName: string) => void} onParsed
 * @param {() => void} [onCleared] - called when the loaded file is removed
 */
export default function RosterDropBox({ maxPlayers, onParsed, onCleared }) {
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
      const { rows, fileWarnings } = await parseRosterFile(file, { maxPlayers });
      setLastFileName(file.name);
      onParsed(rows, fileWarnings, file.name);
    } catch (err) {
      console.error("Roster file parse failed:", err);
      setParseError("Couldn't read that file. Make sure it's a .csv or .xlsx spreadsheet.");
    } finally {
      setParsing(false);
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setLastFileName(null);
    setParseError(null);
    if (inputRef.current) inputRef.current.value = "";
    onCleared?.();
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
          position: "relative",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {lastFileName && !parsing && (
          <button
            type="button"
            onClick={clearFile}
            title="Remove file"
            style={{
              position: "absolute", top: 10, right: 10,
              width: 24, height: 24, borderRadius: "50%",
              background: "#ffffff10", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={13} color="#ffffff80" />
          </button>
        )}

        <Upload size={22} color={C.brand.accent} style={{ marginBottom: 8 }} />
        <p className="fb" style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
          {parsing ? "Reading file..." : "Drop your roster spreadsheet here, or click to browse"}
        </p>
        <p className="fb" style={{ fontSize: 11, color: "#ffffff50" }}>
          .csv or .xlsx — needs name / email columns (phone, shirt size, dietary needs optional)
        </p>
        {lastFileName && !parsing && (
          <p className="fb" style={{ fontSize: 11, color: C.brand.accent, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <FileSpreadsheet size={11} /> {lastFileName} — click the × to replace it
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
