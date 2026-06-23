import os
import json
import re
from typing import List, Dict, Any, Optional

# Try importing mlx_lm
try:
    from mlx_lm import load, generate
    try:
        from mlx_lm.sample_utils import make_sampler
    except ImportError:
        # Fallback for older mlx_lm versions where make_sampler wasn't separated
        make_sampler = None
    MLX_AVAILABLE = True
except ImportError:
    MLX_AVAILABLE = False
    make_sampler = None

from .chunker import ContractChunker
from .vector_store import ContractVectorStore

class ComplianceEngine:
    """
    Orchestrates the RAG and LLM pipeline to evaluate contract compliance.
    """
    def __init__(
        self,
        model_path: str = "mlx-community/Qwen2.5-7B-Instruct-4bit",
        db_dir: str = "data/db",
        rules_path: str = "config/rules.json",
        dry_run: Optional[bool] = None
    ):
        """
        Args:
            model_path: Path or Hugging Face repository name of the MLX model to load.
            db_dir: Path for vector store database.
            rules_path: Path to rules.json config file.
            dry_run: If True, bypasses LLM loading and simulates model outputs based on text searches.
                     If None, defaults to True if mlx-lm is not installed.
        """
        self.model_path = model_path
        self.db_dir = db_dir
        self.rules_path = rules_path
        
        # Auto-detect dry-run if not specified
        self.dry_run = dry_run if dry_run is not None else not MLX_AVAILABLE
        
        self.model = None
        self.tokenizer = None
        
        # Initialize supporting pipelines
        self.chunker = ContractChunker()
        self.vector_store = ContractVectorStore(db_dir=self.db_dir)
        self.rules = self._load_rules()

    def _load_rules(self) -> List[Dict[str, Any]]:
        """Loads compliance rules from configuration JSON file."""
        if not os.path.exists(self.rules_path):
            # Fallback rules in case the file is missing
            return [
                {
                    "id": "RULE-01",
                    "name": "Governing Law",
                    "cuad_category": "Governing Law",
                    "description": "Governed by Delaware or New York state laws.",
                    "criteria": "Verify if the governing law is Delaware or New York.",
                    "severity": "high"
                }
            ]
        
        with open(self.rules_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("rules", [])

    def load_model(self) -> None:
        """Loads the MLX model directly from the configured model_path (local directory or HF repository)."""
        if self.dry_run:
            print("Running in DRY RUN mode. Skipping LLM loading...")
            return

        if not MLX_AVAILABLE:
            raise ImportError(
                "mlx-lm is not installed. Please run `pip install mlx-lm` on macOS "
                "to execute local Apple Silicon inference, or run with dry_run=True."
            )

        print(f"Loading MLX model from {self.model_path} (this might take a minute)...")
        self.model, self.tokenizer = load(self.model_path)
        print("Model loaded successfully!")

    def _clean_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parses the LLM response text, extracting the JSON compliance object."""
        # Try to find JSON block in markdown backticks
        json_match = re.search(r"```json\s*(.*?)\s*```", response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1).strip()
        else:
            # Fallback to standard curly braces search
            brace_match = re.search(r"\{.*\}", response_text, re.DOTALL)
            json_str = brace_match.group(0).strip() if brace_match else response_text.strip()
            
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            print(f"Warning: Failed to parse JSON response: {response_text}")
            return {
                "status": "ERROR",
                "extracted_clause": "Failed to parse model output",
                "risk_explanation": f"The model response was not in a valid JSON format. Raw output: {response_text}"
            }

    def _simulate_rule_evaluation(self, rule: Dict[str, Any], chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Simulates LLM evaluation using keyword heuristics for dry-run testing."""
        combined_text = " ".join([c["text"] for c in chunks]).lower()
        
        status = "COMPLIANT"
        extracted = ""
        explanation = "The contract complies with company policy."
        
        # 1. Governing Law Heuristic
        if rule["id"] == "RULE-01":
            match = re.search(r"laws of (?:the state of )?([a-zA-Z\s]+)(?:,|$|\.)", combined_text, re.IGNORECASE)
            jurisdiction = match.group(1).strip() if match else "unknown"
            
            if "delaware" in combined_text or "new york" in combined_text:
                status = "COMPLIANT"
                extracted = next((c["text"] for c in chunks if "governed" in c["text"].lower()), "")
                explanation = f"Governing law is set to {jurisdiction.title()}, which matches the policy (Delaware or New York)."
            else:
                status = "NON_COMPLIANT"
                extracted = next((c["text"] for c in chunks if "governed" in c["text"].lower()), "Governing Law clause not found")
                explanation = f"Governing law is set to {jurisdiction.title()}, which violates our policy of Delaware or New York."

        # 2. Non-Compete Heuristic
        elif rule["id"] == "RULE-02":
            if "non-compete" in combined_text or "not to engage" in combined_text or "not compete" in combined_text:
                status = "NON_COMPLIANT"
                extracted = next((c["text"] for c in chunks if "compete" in c["text"].lower() or "competition" in c["text"].lower()), "")
                explanation = "Found restrictive covenant prohibiting business competition, violating our policy."
            else:
                status = "COMPLIANT"
                explanation = "No non-compete clauses found in retrieved sections."

        # 3. Liability Cap Heuristic
        elif rule["id"] == "RULE-03":
            if "unlimited" in combined_text or "uncapped" in combined_text or "unlimited and uncapped" in combined_text:
                status = "NON_COMPLIANT"
                extracted = next((c["text"] for c in chunks if "uncapped" in c["text"].lower() or "unlimited" in c["text"].lower() or "liability" in c["text"].lower()), "")
                explanation = "Found clause designating uncapped/unlimited liability for the Customer, violating policy."
            else:
                status = "COMPLIANT"
                extracted = next((c["text"] for c in chunks if "limit" in c["text"].lower() or "exceed" in c["text"].lower()), "")
                explanation = "Found liability limitation cap complying with company guidelines."

        # 4. Termination Notice Heuristic
        elif rule["id"] == "RULE-04":
            # Match digits, potentially enclosed in parentheses, preceding 'days'
            match = re.search(r"(\d+)\s*\)?\s*days", combined_text)
            days = int(match.group(1)) if match else 30
            
            # If the text explicitly writes "fifteen", set to 15
            if "fifteen" in combined_text and "convenience" in combined_text:
                days = 15
            
            extracted = next((c["text"] for c in chunks if "terminate" in c["text"].lower() and "notice" in c["text"].lower()), "")
            
            if days >= 30:
                status = "COMPLIANT"
                explanation = f"Notice period for termination for convenience is {days} days, meeting the 30-day minimum."
            else:
                status = "NON_COMPLIANT"
                explanation = f"Notice period for termination for convenience is only {days} days, which is less than our 30-day requirement."

        # 5. Audit Rights Heuristic
        elif rule["id"] == "RULE-05":
            extracted = next((c["text"] for c in chunks if "audit" in c["text"].lower()), "")
            if extracted:
                if "once" in combined_text or "annual" in combined_text or "reasonable" in combined_text:
                    status = "COMPLIANT"
                    explanation = "Audit rights are restricted to standard reasonable limits."
                else:
                    status = "WARNING"
                    explanation = "Unrestricted audit rights or notice periods found in contract."
            else:
                status = "COMPLIANT"
                explanation = "No audit rights clauses found."

        return {
            "rule_id": rule["id"],
            "status": status,
            "extracted_clause": extracted,
            "risk_explanation": explanation + " (SIMULATED OUTPUT)"
        }

    def evaluate_rule(self, rule: Dict[str, Any], retrieved_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Uses the fine-tuned LLM (or heuristics if in dry_run mode) to check compliance.
        """
        if self.dry_run:
            return self._simulate_rule_evaluation(rule, retrieved_chunks)

        # Combine retrieved contexts
        contexts = "\n\n".join([
            f"--- Document Segment (Distance: {chunk['distance']:.4f}) ---\n{chunk['text']}" 
            for chunk in retrieved_chunks
        ])

        # Define prompts using the ChatML style
        system_content = (
            "You are a legal auditor. Evaluate the provided contract segments against the compliance rule. "
            "Respond ONLY with a JSON object inside a ```json ``` markdown code block. Do not write introductory or concluding remarks."
        )
        
        user_content = f"""Company Compliance Rule:
ID: {rule['id']}
Name: {rule['name']}
Severity: {rule['severity']}
Rule Description: {rule['description']}
Evaluation Criteria: {rule['criteria']}

Contract Segments to Review:
{contexts if contexts else "No relevant segments found in the contract."}

Instructions:
1. Check if the segments violate or comply with the rule.
2. Return a JSON object matching this schema exactly.
3. CRITICAL: The 'extracted_clause' value MUST be copied word-for-word, verbatim, from the provided segments. Do not summarize, rephrase, or add introductory/concluding text. If not found, return an empty string "".
{{
  "rule_id": "{rule['id']}",
  "status": "COMPLIANT" or "NON_COMPLIANT" or "WARNING" or "NOT_FOUND",
  "extracted_clause": "VERBATIM extraction of the clause, or empty string if not found.",
  "risk_explanation": "A concise reason justifying the status choice."
}}
"""

        # Construct ChatML prompt
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content}
        ]
        
        # Format the prompt using Qwen's template
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        
        # Run inference
        print(f"Running LLM inference for rule {rule['id']} ({rule['name']})...")
        sampler = make_sampler(temp=0.0) if make_sampler is not None else None
        response = generate(
            self.model, 
            self.tokenizer, 
            prompt=prompt, 
            sampler=sampler, 
            max_tokens=500
        )
        
        # Clean and parse JSON
        result = self._clean_json_response(response)
        result["rule_name"] = rule["name"]
        result["severity"] = rule["severity"]
        return result

    def analyze_contract_text(self, contract_name: str, text: str, top_k: int = 3) -> Dict[str, Any]:
        """
        Orchestrates full RAG evaluation workflow:
        1. Chunks contract text.
        2. Indexes chunks in vector database.
        3. Queries vector DB for each configured rule.
        4. Runs LLM/simulated rule audits.
        5. Deletes vector index for this contract to preserve storage.
        """
        # Ensure model is loaded (unless in dry run)
        if not self.dry_run and (self.model is None or self.tokenizer is None):
            self.load_model()

        # Step 1: Chunking
        print(f"Chunking contract: {contract_name}...")
        chunks = self.chunker.split_text_parent_child(text, child_size=400, child_overlap=50)
        if not chunks:
            return {
                "contract_name": contract_name,
                "error": "Contract text is empty or could not be parsed.",
                "compliance_summary": {"score": 0.0, "total_rules": len(self.rules), "passed": 0},
                "results": []
            }

        # Step 2: Indexing
        self.vector_store.add_contract_chunks(contract_name, chunks)
        
        results = []
        passed_rules = 0
        
        try:
            # Step 3 & 4: Retrieval and Evaluation
            for rule in self.rules:
                # Retrieve relevant context using CUAD category label
                search_query = f"{rule['cuad_category']} {rule['description']}"
                matches = self.vector_store.search_relevant_chunks(
                    contract_name=contract_name,
                    query=search_query,
                    limit=top_k
                )
                
                # Run LLM check or mock evaluation
                rule_result = self.evaluate_rule(rule, matches)
                
                # Make sure fields are present
                rule_result["rule_name"] = rule["name"]
                rule_result["severity"] = rule["severity"]
                results.append(rule_result)
                
                if rule_result.get("status") in ["COMPLIANT", "NOT_FOUND"]:
                    passed_rules += 1
                    
        finally:
            # Clean up vector database indexing for this contract
            self.vector_store.delete_contract(contract_name)
            
        compliance_percentage = (passed_rules / len(self.rules)) * 100 if self.rules else 100.0
        
        return {
            "contract_name": contract_name,
            "compliance_summary": {
                "score": round(compliance_percentage, 1),
                "total_rules": len(self.rules),
                "passed": passed_rules,
                "failed": len(self.rules) - passed_rules
            },
            "results": results
        }
