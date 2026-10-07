#!/usr/bin/env bash
# PreToolUse-Hook: protokolliert jeden Tool-Aufruf von Claude Code als JSON-Zeile.
# Ziel: logs/tool-calls-JJJJ-MM-TT.jsonl im Projektstamm (eine Datei pro Tag).
# Blockiert nie: Fehler beim Loggen werden ignoriert, der Tool-Aufruf läuft immer weiter.

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
log_dir="$project_dir/logs"
log_file="$log_dir/tool-calls-$(date +%F).jsonl"
max_len=2000  # längere Texte (z. B. Dateiinhalte bei Write) werden gekürzt

mkdir -p "$log_dir" 2>/dev/null || exit 0

jq -c --arg ts "$(date -Iseconds)" --argjson max "$max_len" '
  {
    ts: $ts,
    event: .hook_event_name,
    session: .session_id,
    cwd: .cwd,
    tool: .tool_name,
    input: (.tool_input | walk(
      if type == "string" and length > $max
      then .[0:$max] + "… [gekürzt, \(length) Zeichen]"
      else . end
    ))
  }
' >> "$log_file" 2>/dev/null

exit 0
