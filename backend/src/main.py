import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from .compliance_engine import ComplianceEngine

# Initialize FastAPI app
app = FastAPI(
    title="MSA Compliance Automation API",
    description="Backend API for auditing Master Service Agreements against company compliance guidelines.",
    version="1.0.0"
)

# Enable CORS for local frontend development (typically localhost:3000 or localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global engine instance. Defer loading of heavy model weights to startup or first request
engine = None

@app.on_event("startup")
def startup_event():
    global engine
    # Initialize engine. By default, it detects if MLX is available
    engine = ComplianceEngine()
    
    # We defer calling `engine.load_model()` here because loading the 4-bit model
    # requires a GPU/Unified memory and takes ~30 seconds.
    # It will automatically load on the first call to /analyze if not in dry-run mode.
    print("FastAPI Backend startup complete. Compliance Engine initialized.")

class AnalyzeTextRequest(BaseModel):
    contract_name: str
    text_content: str

@app.post("/api/analyze/text", summary="Analyze raw contract text")
async def analyze_text(request: AnalyzeTextRequest):
    """
    Accepts raw contract text and runs it through the compliance engine.
    """
    global engine
    if not engine:
        raise HTTPException(status_code=500, detail="Compliance engine not initialized.")
        
    try:
        report = engine.analyze_contract_text(request.contract_name, request.text_content)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze/file", summary="Upload and analyze a contract file (.txt)")
async def analyze_file(file: UploadFile = File(...)):
    """
    Accepts an uploaded text (.txt) contract file and analyzes it.
    """
    global engine
    if not engine:
        raise HTTPException(status_code=500, detail="Compliance engine not initialized.")

    # Validate file extension
    filename = file.filename or "contract.txt"
    if not filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only plain text (.txt) files are supported for now.")

    try:
        contents = await file.read()
        text_content = contents.decode("utf-8")
        report = engine.analyze_contract_text(filename, text_content)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RuleModel(BaseModel):
    id: str
    name: str
    cuad_category: str
    description: str
    criteria: str
    severity: str

@app.post("/api/rules", summary="Update or add a compliance rule")
async def save_rule(rule: RuleModel):
    global engine
    if not engine:
        raise HTTPException(status_code=500, detail="Compliance engine not initialized.")
        
    try:
        import json
        rules_path = engine.rules_path
        rules_data = {"rules": []}
        
        if os.path.exists(rules_path):
            with open(rules_path, "r", encoding="utf-8") as f:
                rules_data = json.load(f)
                
        # Find if rule already exists and update it, else append it
        existing_idx = -1
        for idx, r in enumerate(rules_data.get("rules", [])):
            if r["id"] == rule.id:
                existing_idx = idx
                break
                
        rule_dict = rule.model_dump() if hasattr(rule, 'model_dump') else rule.dict()
        if existing_idx != -1:
            rules_data["rules"][existing_idx] = rule_dict
        else:
            rules_data["rules"].append(rule_dict)
            
        # Write back to file
        with open(rules_path, "w", encoding="utf-8") as f:
            json.dump(rules_data, f, indent=2)
            
        # Refresh engine's rules list
        engine.rules = rules_data["rules"]
        return {"status": "success", "rules": engine.rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rules", summary="Get all compliance rules")
async def get_rules():
    """
    Returns the list of active compliance rules loaded from configuration.
    """
    global engine
    if not engine:
        raise HTTPException(status_code=500, detail="Compliance engine not initialized.")
    return {"rules": engine.rules}

@app.get("/api/health", summary="API Health status check")
async def health_check():
    """
    Returns system status, MLX availability, and dry-run status.
    """
    global engine
    from .compliance_engine import MLX_AVAILABLE
    return {
        "status": "healthy",
        "mlx_available": MLX_AVAILABLE,
        "dry_run_active": engine.dry_run if engine else True,
        "model_configured": engine.model_path if engine else None
    }
