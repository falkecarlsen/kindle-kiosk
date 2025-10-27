#!/bin/sh
# Kindle MKK Dashboard Launcher
# Runs dashboard.sh and run-hid-client.sh in parallel,
# prevents screensaver, and cleans up on exit.

DASHBOARD_SCRIPT="/mnt/us/mkk/run-dashboard.sh"
HID_SCRIPT="/mnt/us/mkk/run-hid-client.sh"

# --- Setup -------------------------------------------------------------

# Prevent Kindle from going to sleep
lipc-set-prop com.lab126.powerd preventScreenSaver 1

cleanup() {
  echo "[run-all] Cleaning up..."

  # Re-enable normal screensaver behavior
  lipc-set-prop com.lab126.powerd preventScreenSaver 0

  # Kill running children gracefully
  if [ -n "$PID_DASH" ] && kill -0 "$PID_DASH" 2>/dev/null; then
    echo "[run-all] Killing dashboard.sh (PID $PID_DASH)"
    kill "$PID_DASH" 2>/dev/null
  fi

  if [ -n "$PID_HID" ] && kill -0 "$PID_HID" 2>/dev/null; then
    echo "[run-all] Killing run-hid-client.sh (PID $PID_HID)"
    kill "$PID_HID" 2>/dev/null
  fi

  wait
  echo "[run-all] Done."
}

# Ensure cleanup happens on script exit or interrupt
trap cleanup INT TERM EXIT

# --- Launch ------------------------------------------------------------

echo "[run-all] Launching dashboard and HID client..."
"$DASHBOARD_SCRIPT" &
PID_DASH=$!

"$HID_SCRIPT" &
PID_HID=$!

echo "[run-all] dashboard.sh PID=$PID_DASH, run-hid-client.sh PID=$PID_HID"

# Block until one exits (or trap fires)
wait
