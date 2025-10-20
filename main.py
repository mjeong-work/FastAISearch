from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Optional
import json
from pathlib import Path

app = FastAPI(title="AI Tools Search API")

DATA_FILE = Path("data/tools.json")

def load_tools():
    with open(DATA_FILE, "r") as f:
        return json.load(f)

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

@app.get("/api/tools")
async def get_tools(
    search: Optional[str] = Query(None, description="Search keyword for name, description, or tags"),
    category: Optional[str] = Query(None, description="Filter by category"),
    pricing: Optional[str] = Query(None, description="Filter by pricing type (free, paid, free/paid)")
):
    tools = load_tools()
    
    if search:
        search_lower = search.lower()
        tools = [
            tool for tool in tools
            if search_lower in tool["name"].lower()
            or search_lower in tool["description"].lower()
            or any(search_lower in tag.lower() for tag in tool["tags"])
        ]
    
    if category:
        tools = [tool for tool in tools if tool["category"].lower() == category.lower()]
    
    if pricing:
        tools = [tool for tool in tools if pricing.lower() in tool["pricing"].lower()]
    
    return tools

@app.get("/api/tools/{tool_id}")
async def get_tool(tool_id: int):
    tools = load_tools()
    tool = next((t for t in tools if t["id"] == tool_id), None)
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool

@app.get("/api/tools/compare")
async def compare_tools(ids: str = Query(..., description="Comma-separated tool IDs (max 3)")):
    try:
        tool_ids = [int(id.strip()) for id in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tool IDs")
    
    if len(tool_ids) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 tools can be compared")
    
    tools = load_tools()
    selected_tools = [tool for tool in tools if tool["id"] in tool_ids]
    
    return selected_tools

@app.get("/api/categories")
async def get_categories():
    tools = load_tools()
    categories = sorted(list(set(tool["category"] for tool in tools)))
    return categories

app.mount("/static", StaticFiles(directory="static"), name="static")
