import json
import logging
import os
from contextlib import contextmanager
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Dict, List, Optional

import fcntl
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator

app = FastAPI(title="OptivAI")

DATA_FILE = Path("data/tools.json")
LOCK_FILE = DATA_FILE.with_suffix(".lock")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tools")


def ensure_data_dir() -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)


def _coerce_str_list(value) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return []


def _coerce_bool(value, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y", "on"}:
            return True
        if lowered in {"false", "0", "no", "n", "off"}:
            return False
    return bool(value)


def normalize_tool(raw: Dict) -> Dict:
    """Normalize incoming tool definitions to the legacy schema."""

    normalized = {
        "id": int(raw.get("id", 0) or 0),
        "name": str(raw.get("name") or raw.get("title") or "").strip(),
        "description": str(raw.get("description") or raw.get("short_desc")
                            or "").strip(),
        "category": str(raw.get("category") or raw.get("type") or "").strip(),
        "pricing": str(raw.get("pricing") or raw.get("cost") or "").strip(),
        "tags": _coerce_str_list(raw.get("tags") or raw.get("keywords") or []),
        "features": _coerce_str_list(raw.get("features")
                                      or raw.get("capabilities") or []),
        "website": str(raw.get("website") or raw.get("url") or "").strip(),
        "published": _coerce_bool(raw.get("published"), True),
    }

    return normalized


def read_tools_file() -> List[Dict]:
    ensure_data_dir()
    if not DATA_FILE.exists():
        return []

    try:
        with DATA_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        logger.exception("Failed to decode JSON from %s", DATA_FILE)
        return []
    except OSError:
        logger.exception("Failed to read %s", DATA_FILE)
        return []

    if not isinstance(data, list):
        logger.error("Tools data is not a list")
        return []

    return data


def load_tools() -> List[Dict]:
    raw_tools = read_tools_file()
    normalized_tools = []
    for raw in raw_tools:
        if isinstance(raw, dict):
            normalized_tools.append(normalize_tool(raw))
    return normalized_tools


@contextmanager
def acquire_file_lock(path: Path):
    ensure_data_dir()
    fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def save_tools(tools: List[Dict]) -> None:
    normalized = [normalize_tool(tool) for tool in tools]
    with acquire_file_lock(LOCK_FILE):
        with NamedTemporaryFile("w", dir=str(DATA_FILE.parent), delete=False,
                                encoding="utf-8") as tmp:
            json.dump(normalized, tmp, indent=2, ensure_ascii=False)
            tmp.flush()
            os.fsync(tmp.fileno())
        os.replace(tmp.name, DATA_FILE)


class ToolCreate(BaseModel):
    name: str
    description: str
    category: str
    pricing: str
    tags: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    website: str
    published: bool = True

    @validator("tags", "features", pre=True)
    def ensure_list(cls, value):
        return _coerce_str_list(value)


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    pricing: Optional[str] = None
    tags: Optional[List[str]] = None
    features: Optional[List[str]] = None
    website: Optional[str] = None
    published: Optional[bool] = None

    @validator("tags", "features", pre=True)
    def ensure_list(cls, value):
        if value is None:
            return value
        return _coerce_str_list(value)


def get_published_tools() -> List[Dict]:
    return [tool for tool in load_tools() if tool.get("published", True)]


@app.get("/")
async def read_root():
    return FileResponse("static/index.html")


@app.get("/admin/tools")
async def admin_tools_page():
    return FileResponse("static/admin/list.html")


@app.get("/admin/tools/new")
async def admin_tools_new_page():
    return FileResponse("static/admin/new.html")


@app.get("/api/tools")
async def get_tools(
        search: Optional[str] = Query(
            None, description="Search keyword for name, description, or tags"),
        category: Optional[str] = Query(None,
                                        description="Filter by category"),
        pricing: Optional[str] = Query(
            None,
            description="Filter by pricing type (free, paid, free/paid)")):
    tools = get_published_tools()

    if search:
        search_lower = search.lower()
        tools = [
            tool for tool in tools if search_lower in tool["name"].lower()
            or search_lower in tool["description"].lower() or any(
                search_lower in tag.lower() for tag in tool["tags"])
        ]

    if category:
        tools = [
            tool for tool in tools
            if tool["category"].lower() == category.lower()
        ]

    if pricing:
        tools = [
            tool for tool in tools
            if pricing.lower() in tool["pricing"].lower()
        ]

    return tools


@app.get("/api/tools/{tool_id}")
async def get_tool(tool_id: int):
    tools = get_published_tools()
    tool = next((t for t in tools if t["id"] == tool_id), None)
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool


@app.get("/api/tools/compare")
async def compare_tools(ids: str = Query(
    ..., description="Comma-separated tool IDs (max 3)")):
    try:
        tool_ids = [int(id.strip()) for id in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tool IDs")

    if len(tool_ids) > 3:
        raise HTTPException(status_code=400,
                            detail="Maximum 3 tools can be compared")

    tools = get_published_tools()
    selected_tools = [tool for tool in tools if tool["id"] in tool_ids]

    return selected_tools


@app.get("/api/categories")
async def get_categories():
    tools = get_published_tools()
    categories = sorted({tool["category"] for tool in tools if tool["category"]})
    return categories


@app.get("/api/admin/tools")
async def admin_get_tools(published: Optional[bool] = Query(
        None, description="Filter results by published state")):
    tools = load_tools()
    if published is not None:
        tools = [tool for tool in tools if tool.get("published", True) == published]
    return tools


@app.post("/api/admin/tools", status_code=201)
async def admin_create_tool(tool: ToolCreate):
    tools = load_tools()
    next_id = max((existing["id"] for existing in tools), default=0) + 1
    new_tool = tool.dict()
    new_tool["id"] = next_id
    tools.append(new_tool)
    save_tools(tools)
    return normalize_tool(new_tool)


@app.patch("/api/admin/tools/{tool_id}")
async def admin_update_tool(tool_id: int, updates: ToolUpdate):
    update_data = updates.dict(exclude_unset=True)
    tools = load_tools()
    for index, tool in enumerate(tools):
        if tool["id"] == tool_id:
            updated_tool = {**tool, **update_data}
            tools[index] = updated_tool
            save_tools(tools)
            return normalize_tool(updated_tool)
    raise HTTPException(status_code=404, detail="Tool not found")


@app.delete("/api/admin/tools/{tool_id}")
async def admin_delete_tool(tool_id: int):
    tools = load_tools()
    remaining = [tool for tool in tools if tool["id"] != tool_id]
    if len(remaining) == len(tools):
        raise HTTPException(status_code=404, detail="Tool not found")
    save_tools(remaining)
    return {"status": "deleted"}


app.mount("/static", StaticFiles(directory="static"), name="static")
