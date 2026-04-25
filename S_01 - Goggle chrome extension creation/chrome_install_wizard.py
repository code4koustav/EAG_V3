"""
SummaryGo Chrome Setup Wizard — terminal experience for venv, deps, icons, and load instructions.

Run: python chrome_install_wizard.py
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV_PY = ROOT / "venv" / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")


def _banner() -> None:
    mint = "\033[38;5;43m"
    gold = "\033[38;5;220m"
    dim = "\033[2m"
    reset = "\033[0m"
    art = f"""
{mint}   _____ _ __  __  __      {gold} ____       {mint}_{reset}
{mint}  / ___/| '_ \\|  \\/  |     {gold}/ ___| ___  {mint}| |{reset}
{mint}  \\___ \\| | | | |\\/| |    {gold}| |  _ / _ \\ {mint}| |{reset}
{mint}   ___) | |_| | |  | |    {gold}| |_| | (_) |{mint}| |{reset}
{mint}  |____/ \\__, |_|  |_|     {gold}\\____|\\___/ {mint}|_|{reset}
{mint}         |___/{reset}
{dim}       Chrome companion - local-first meanings and summaries{reset}
"""
    print(art, flush=True)


def _step(n: int, total: int, title: str) -> None:
    bar = f"[{n}/{total}]"
    print(f"\n\033[1;97m{bar}\033[0m \033[96m{title}\033[0m")
    print("-" * (len(bar) + len(title) + 2))


def _run(cmd: list[str], *, cwd: Path | None = None) -> None:
    print(" \033[2m->\033[0m", " ".join(cmd))
    subprocess.check_call(cmd, cwd=cwd or ROOT)


def ensure_venv() -> Path:
    _step(1, 5, "Preparing Python virtual environment")
    if not VENV_PY.exists():
        _run([sys.executable, "-m", "venv", "venv"])
        print("  \033[92m[ok]\033[0m Created ./venv")
    else:
        print("  \033[92m[ok]\033[0m venv already present")
    return VENV_PY


def install_deps(py: Path) -> None:
    _step(2, 5, "Installing backend dependencies")
    _run([str(py), "-m", "pip", "install", "--upgrade", "pip"])
    _run([str(py), "-m", "pip", "install", "-r", "requirements.txt"])
    print("  \033[92m[ok]\033[0m requirements.txt installed")


def mint_icons(py: Path) -> None:
    _step(3, 5, "Generating SummaryGo extension icons (stdlib PNG)")
    _run([str(py), str(ROOT / "tools" / "generate_icons.py")])
    print("  \033[92m[ok]\033[0m Icons ready under extension/icons/")


def verify_import(py: Path) -> None:
    _step(4, 5, "Verifying SummaryGo server import")
    _run([str(py), "-c", "from server.main import app; assert app.title"])
    print("  \033[92m[ok]\033[0m server.main loads")


def chrome_instructions() -> None:
    _step(5, 5, "Load the unpacked extension in Google Chrome")
    ext = ROOT / "extension"
    ext_uri = ext.as_uri()
    print(f"""
  \033[1;97mYour extension folder\033[0m
    {ext}

  \033[1;97mChrome steps\033[0m
    1. Start the API (from this folder):  \033[96m.\\venv\\Scripts\\python run_server.py\033[0m
    2. Chrome: open \033[96mchrome://extensions\033[0m
    3. Enable \033[96mDeveloper mode\033[0m
    4. Click \033[96mLoad unpacked\033[0m and choose the \033[96mextension\033[0m folder above

  \033[2mTip: pin SummaryGo from the puzzle menu for quicker access.\033[0m
""")
    if os.name == "nt":
        try:
            os.startfile(str(ext))  # type: ignore[attr-defined]
            print("  \033[92m[ok]\033[0m Opened the extension folder in Explorer")
        except OSError:
            print("  \033[93m[!]\033[0m Could not auto-open Explorer - open the path manually.")
    print(f"\n  File URL (reference): \033[2m{ext_uri}\033[0m\n")


def main() -> int:
    _banner()
    if sys.version_info < (3, 10):
        print("\033[91mPython 3.10+ is required.\033[0m")
        return 1
    try:
        py = ensure_venv()
        install_deps(py)
        mint_icons(py)
        verify_import(py)
        chrome_instructions()
        print("\033[92mWizard complete - welcome to SummaryGo.\033[0m\n")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"\n\033[91mStep failed (exit {e.returncode}).\033[0m")
        return e.returncode or 1


if __name__ == "__main__":
    raise SystemExit(main())
