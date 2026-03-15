"""
Metrolinkdle — FastAPI Backend
==========================
Responsibilities:
  - GET  /api/daily               → today's target stop (deterministic, date-seeded)
  - POST /api/stats               → persist a completed game result
  - GET  /api/stats/{player}      → retrieve stats for a player
  - GET  /api/daily-stats/{date}  → aggregated scores across all players for a date
  - GET  /health                  → health check

All graph logic, BFS, and game UI live in the React frontend.
Stats are stored in SQLite (persisted to a volume at /data).
"""

import hashlib
import json
import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─── Config ───────────────────────────────────────────────────────────────────

DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
DB_PATH  = DATA_DIR / "metrolinkdle.db"

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

# ─── Stop list ────────────────────────────────────────────────────────────────

STOPS_FILE = Path(__file__).parent / "stops.json"

def load_stops() -> list[str]:
    if not STOPS_FILE.exists():
        raise RuntimeError(
            f"stops.json not found at {STOPS_FILE}. "
            "Run build_graph.py and copy stops.json into the backend folder."
        )
    with open(STOPS_FILE) as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "stops" in data:
        return list(data["stops"].keys())
    raise ValueError("Unexpected stops.json format")

# ─── Daily target logic ───────────────────────────────────────────────────────

LAUNCH_DATE = date(2026, 3, 13)  # Puzzle #1

def get_daily_stop(stops: list[str], for_date: date | None = None) -> dict:
    d = for_date or date.today()
    digest = hashlib.sha256(d.isoformat().encode()).hexdigest()
    index  = int(digest[:8], 16) % len(stops)
    game_number = (d - LAUNCH_DATE).days + 1
    return {
        "stop":        stops[index],
        "date":        d.isoformat(),
        "stop_index":  index,
        "game_number": max(game_number, 1),
    }

# ─── Database ─────────────────────────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS game_results (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id   TEXT    NOT NULL,
                date        TEXT    NOT NULL,
                won         INTEGER NOT NULL,
                guesses     INTEGER NOT NULL,
                target_stop TEXT    NOT NULL,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(player_id, date)
            );

            CREATE INDEX IF NOT EXISTS idx_player ON game_results(player_id);
            CREATE INDEX IF NOT EXISTS idx_date   ON game_results(date);
        """)

# ─── Streak helpers ───────────────────────────────────────────────────────────

def calculate_streaks(dates_asc: list[str]) -> tuple[int, int]:
    """
    Given an ascending list of ISO date strings, return (current_streak, max_streak).
    A streak is consecutive calendar days. current_streak is 0 if the player
    hasn't played today or yesterday.
    """
    if not dates_asc:
        return 0, 0

    streak = 1
    max_streak = 1
    for i in range(1, len(dates_asc)):
        prev = date.fromisoformat(dates_asc[i - 1])
        curr = date.fromisoformat(dates_asc[i])
        if (curr - prev).days == 1:
            streak += 1
            max_streak = max(max_streak, streak)
        elif (curr - prev).days > 1:
            streak = 1

    # Current streak is only alive if last game was today or yesterday
    last = date.fromisoformat(dates_asc[-1])
    today = date.today()
    current_streak = streak if (today - last).days <= 1 else 0

    return current_streak, max_streak

# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    app.state.stops = load_stops()
    yield

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Metrolinkdle API",
    description="Backend for Metrolinkdle — Manchester Metrolink Wordle",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ─── Schemas ──────────────────────────────────────────────────────────────────

class GameResult(BaseModel):
    player_id:   str  = Field(..., min_length=1, max_length=64)
    date:        str  = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    won:         bool
    guesses:     int  = Field(..., ge=1, le=8)
    target_stop: str  = Field(..., min_length=1, max_length=64)


class PlayerStats(BaseModel):
    player_id:          str
    games_played:       int
    games_won:          int
    win_rate:           float
    current_streak:     int
    max_streak:         int
    guess_distribution: dict[str, int]


class DailyStats(BaseModel):
    date:               str
    total_players:      int
    win_rate:           float
    guess_distribution: dict[str, int]   # counts of each guess number among winners
    average_guesses:    float            # among winners only


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "db": str(DB_PATH)}


@app.get("/api/daily")
def daily_stop():
    return get_daily_stop(app.state.stops)


@app.get("/api/daily/{iso_date}")
def daily_stop_for_date(iso_date: str):
    try:
        d = date.fromisoformat(iso_date)
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")
    return get_daily_stop(app.state.stops, d)


@app.post("/api/stats", status_code=201)
def record_result(result: GameResult):
    """Record the outcome of a completed game. Idempotent on player+date."""
    try:
        date.fromisoformat(result.date)
    except ValueError:
        raise HTTPException(400, "Invalid date.")

    with get_db() as conn:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO game_results
                   (player_id, date, won, guesses, target_stop)
                   VALUES (?, ?, ?, ?, ?)""",
                (result.player_id, result.date,
                 int(result.won), result.guesses, result.target_stop),
            )
        except sqlite3.Error as e:
            raise HTTPException(500, f"DB error: {e}")

    return {"status": "ok"}


@app.get("/api/stats/{player_id}", response_model=PlayerStats)
def get_stats(player_id: str):
    """Return aggregated lifetime stats for a player."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT date, won, guesses
               FROM game_results
               WHERE player_id = ?
               ORDER BY date ASC""",
            (player_id,),
        ).fetchall()

    if not rows:
        return PlayerStats(
            player_id=player_id,
            games_played=0, games_won=0, win_rate=0.0,
            current_streak=0, max_streak=0,
            guess_distribution={str(i): 0 for i in range(1, 9)},
        )

    games_played = len(rows)
    games_won    = sum(1 for r in rows if r["won"])
    win_rate     = round(games_won / games_played * 100, 1) if games_played else 0.0

    dist = {str(i): 0 for i in range(1, 9)}
    for r in rows:
        if r["won"]:
            dist[str(r["guesses"])] = dist.get(str(r["guesses"]), 0) + 1

    dates_asc = [r["date"] for r in rows]
    current_streak, max_streak = calculate_streaks(dates_asc)

    return PlayerStats(
        player_id=player_id,
        games_played=games_played,
        games_won=games_won,
        win_rate=win_rate,
        current_streak=current_streak,
        max_streak=max_streak,
        guess_distribution=dist,
    )


@app.get("/api/daily-stats/{iso_date}", response_model=DailyStats)
def get_daily_stats(iso_date: str):
    """
    Return aggregated stats across ALL players for a given date.
    Used in the result modal to show how the player compared to everyone else.
    """
    try:
        date.fromisoformat(iso_date)
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")

    with get_db() as conn:
        rows = conn.execute(
            """SELECT won, guesses
               FROM game_results
               WHERE date = ?""",
            (iso_date,),
        ).fetchall()

    if not rows:
        return DailyStats(
            date=iso_date,
            total_players=0,
            win_rate=0.0,
            guess_distribution={str(i): 0 for i in range(1, 9)},
            average_guesses=0.0,
        )

    total   = len(rows)
    winners = [r for r in rows if r["won"]]
    win_rate = round(len(winners) / total * 100, 1)

    dist = {str(i): 0 for i in range(1, 9)}
    for r in winners:
        dist[str(r["guesses"])] += 1

    avg = round(sum(r["guesses"] for r in winners) / len(winners), 1) if winners else 0.0

    return DailyStats(
        date=iso_date,
        total_players=total,
        win_rate=win_rate,
        guess_distribution=dist,
        average_guesses=avg,
    )
