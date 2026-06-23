import json
import os
import random
import time
import re
import argparse
from collections import Counter
from typing import List, Dict, Any, Tuple

from src.compliance_engine import ComplianceEngine, MLX_AVAILABLE

# Category mapping from config rules to CUAD JSON categories
CUAD_CATEGORY_MAP = {
    "RULE-01": "Governing Law",
    "RULE-02": "Non-Compete",
    "RULE-03": "Cap On Liability",
    "RULE-04": "Termination For Convenience",
    "RULE-05": "Audit Rights"
}

def normalize_text(text: str) -> str:
    """Normalize text by lowercasing, stripping punctuation and duplicate whitespaces."""
    if not text:
        return ""
    text = text.lower()
    # Remove punctuation
    text = re.sub(r'[^\w\s]', '', text)
    # Normalize whitespaces
    return " ".join(text.split())

def calculate_exact_match(prediction: str, ground_truth: str) -> int:
    """Returns 1 if prediction matches ground_truth exactly after normalization, else 0."""
    return int(normalize_text(prediction) == normalize_text(ground_truth))

def calculate_f1_score(prediction: str, ground_truth: str) -> float:
    """Calculates word-level F1-score between prediction and ground_truth."""
    pred_tokens = normalize_text(prediction).split()
    truth_tokens = normalize_text(ground_truth).split()
    
    if len(pred_tokens) == 0 or len(truth_tokens) == 0:
        return 1.0 if len(pred_tokens) == len(truth_tokens) else 0.0
        
    pred_counter = Counter(pred_tokens)
    truth_counter = Counter(truth_tokens)
    
    common = pred_counter & truth_counter
    num_same = sum(common.values())
    
    if num_same == 0:
        return 0.0
        
    precision = num_same / len(pred_tokens)
    recall = num_same / len(truth_tokens)
    
    f1 = (2 * precision * recall) / (precision + recall)
    return f1

def clean_prediction_text(text: str) -> str:
    """Cleans prediction text, treating semantic 'not found' sentences as empty string."""
    if not text:
        return ""
    text_stripped = text.strip()
    lower_text = text_stripped.lower()
    
    # Heuristic list of statements indicating absence of a clause
    indicators = [
        "not found", 
        "no non-compete", 
        "does not contain", 
        "no relevant", 
        "failed to parse",
        "clause not found",
        "not explicitly mentioned",
        "no clause",
        "no limitation of liability",
        "no payment terms"
    ]
    if any(ind in lower_text for ind in indicators):
        return ""
    return text_stripped

def get_contract_files(base_dir: str = "cuad_data/CUAD_v1/full_contract_txt") -> Dict[str, str]:
    """Scans Part_I and Part_II subdirectories to find full contract txt files."""
    contract_files = {}
    for part in ["Part_I", "Part_II"]:
        part_path = os.path.join(base_dir, part)
        if os.path.exists(part_path):
            for file in os.listdir(part_path):
                if file.endswith(".txt"):
                    title = file[:-4]  # Remove .txt extension
                    contract_files[title] = os.path.join(part_path, file)
    return contract_files

def get_gold_standard(paragraphs: List[Dict[str, Any]], cuad_category: str) -> str:
    """Aggregates all annotated answers for a target category to build document gold standard."""
    answers = []
    target_pattern = f'related to "{cuad_category}"'
    for para in paragraphs:
        for qa in para.get("qas", []):
            if target_pattern in qa.get("question", ""):
                if not qa.get("is_impossible", False) and "answers" in qa:
                    for ans in qa["answers"]:
                        text = ans.get("text", "").strip()
                        if text:
                            answers.append(text)
                            
    # Deduplicate while preserving order
    seen = set()
    unique_answers = []
    for ans in answers:
        if ans not in seen:
            seen.add(ans)
            unique_answers.append(ans)
            
    return " ".join(unique_answers)

def run_benchmark(num_samples: int = 3, seed: int = 42, use_mlx: bool = False, verbose: bool = False):
    json_path = "data/CUAD_v1.json"
    
    print("=" * 80)
    print("                RAG PIPELINE END-TO-END BENCHMARK")
    print("=" * 80)
    print(f"Parameters: samples={num_samples}, seed={seed}, mlx_mode={use_mlx}")
    print("-" * 80)
    
    if not os.path.exists(json_path):
        print(f"[ERROR] CUAD dataset JSON file not found at {json_path}")
        return
        
    # Get all contract txt files from disk
    disk_contracts = get_contract_files()
    if not disk_contracts:
        print("[ERROR] No contract .txt files found in cuad_data/CUAD_v1/full_contract_txt/")
        return
        
    print(f"Found {len(disk_contracts)} full contract text files on disk.")
    
    # Load CUAD annotations
    print(f"Loading CUAD annotations from {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        cuad_data = json.load(f)
        
    # Build dictionary mapping title -> paragraphs
    annotation_map = {}
    for doc in cuad_data.get("data", []):
        annotation_map[doc["title"]] = doc.get("paragraphs", [])
        
    # Find overlapping contracts that exist on disk and in the annotations
    valid_titles = [title for title in disk_contracts.keys() if title in annotation_map]
    print(f"Overlapping contracts available for evaluation: {len(valid_titles)}")
    
    if len(valid_titles) == 0:
        print("[ERROR] No overlapping contracts between disk files and CUAD JSON annotations.")
        return
        
    # Select random sample
    random.seed(seed)
    selected_titles = random.sample(valid_titles, min(num_samples, len(valid_titles)))
    print(f"Selected {len(selected_titles)} contracts for evaluation:")
    for idx, title in enumerate(selected_titles):
        print(f"  {idx + 1}. {title}")
    print("-" * 80)
    
    # Initialize compliance engine once
    dry_run = not use_mlx
    engine = ComplianceEngine(dry_run=dry_run)
    if not dry_run:
        if not MLX_AVAILABLE:
            print("[WARNING] MLX library not found. Falling back to DRY-RUN mode.")
            engine.dry_run = True
        else:
            try:
                engine.load_model()
            except Exception as e:
                print(f"[ERROR] Failed to load MLX model: {e}")
                print("Switching to DRY-RUN simulation...")
                engine.dry_run = True
                
    # Define hyperparameter configurations to sweep
    configurations = [
        {"chunk_size": 1000, "chunk_overlap": 100, "top_k": 3},
        {"chunk_size": 2000, "chunk_overlap": 200, "top_k": 3},
        {"chunk_size": 2000, "chunk_overlap": 200, "top_k": 5},
    ]
    
    results_summary = []
    
    for c_idx, config in enumerate(configurations):
        print(f"\nEvaluating Configuration {c_idx + 1}/{len(configurations)}:")
        print(f"  Chunk Size: {config['chunk_size']} | Chunk Overlap: {config['chunk_overlap']} | Top K: {config['top_k']}")
        print("-" * 80)
        
        # Override compliance engine chunking configurations
        engine.chunker.chunk_size = config["chunk_size"]
        engine.chunker.chunk_overlap = config["chunk_overlap"]
        
        total_f1 = 0.0
        total_em = 0.0
        comparisons_count = 0
        
        start_time = time.perf_counter()
        
        for s_idx, title in enumerate(selected_titles):
            file_path = disk_contracts[title]
            with open(file_path, "r", encoding="utf-8") as f:
                contract_text = f.read()
                
            # Run RAG execution
            report = engine.analyze_contract_text(
                contract_name=title,
                text=contract_text,
                top_k=config["top_k"]
            )
            
            # Map of rule predictions
            predictions = {res["rule_id"]: res for res in report.get("results", [])}
            
            # Retrieve paragraphs for gold standard
            paragraphs = annotation_map[title]
            
            for rule_id, cuad_category in CUAD_CATEGORY_MAP.items():
                if rule_id not in predictions:
                    continue
                    
                # Model output
                pred_clause = predictions[rule_id].get("extracted_clause", "")
                pred_clause_cleaned = clean_prediction_text(pred_clause)
                
                # Ground truth standard
                gold_clause = get_gold_standard(paragraphs, cuad_category)
                
                # Compute metrics
                f1 = calculate_f1_score(pred_clause_cleaned, gold_clause)
                em = calculate_exact_match(pred_clause_cleaned, gold_clause)
                
                total_f1 += f1
                total_em += em
                comparisons_count += 1
                
                if verbose:
                    print(f"\n  [Contract {s_idx + 1}/{len(selected_titles)}] - {title[:40]}...")
                    print(f"  Category: {cuad_category} ({rule_id})")
                    print(f"  GOLD STANDARD CLAUSE:\n  {gold_clause if gold_clause else '[No clause present]'}")
                    print(f"  MODEL PREDICTED CLAUSE:\n  {pred_clause_cleaned if pred_clause_cleaned else '[No clause predicted]'}")
                    print(f"  Metrics -> F1: {f1:.2f} | EM: {em}")
                    print("  " + "." * 60)
                    
        elapsed = time.perf_counter() - start_time
        avg_f1 = (total_f1 / comparisons_count) * 100 if comparisons_count > 0 else 0.0
        avg_em = (total_em / comparisons_count) * 100 if comparisons_count > 0 else 0.0
        
        print(f"Finished evaluation in {elapsed:.2f} seconds.")
        print(f"Results -> Avg F1-Score: {avg_f1:.2f}% | Avg Exact Match: {avg_em:.2f}%")
        
        results_summary.append({
            "config_id": c_idx + 1,
            "chunk_size": config["chunk_size"],
            "chunk_overlap": config["chunk_overlap"],
            "top_k": config["top_k"],
            "avg_f1": avg_f1,
            "avg_em": avg_em,
            "time_taken": elapsed
        })
        
    print("\n" + "=" * 80)
    print("                       FINAL BENCHMARK COMPARISON TABLE")
    print("=" * 80)
    print(f"{'Config ID':<10} | {'Chunk Size':<12} | {'Overlap':<10} | {'Top-K':<8} | {'Avg F1-Score':<14} | {'Avg EM':<10}")
    print("-" * 80)
    for res in results_summary:
        print(f"{res['config_id']:<10} | {res['chunk_size']:<12} | {res['chunk_overlap']:<10} | {res['top_k']:<8} | {res['avg_f1']:>11.2f}% | {res['avg_em']:>7.2f}%")
    print("=" * 80)
    print("Note: All 5 compliance rules are mapped and evaluated against CUAD gold annotations.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run End-to-End RAG Pipeline Benchmark on CUAD full contracts.")
    parser.add_argument("--samples", type=int, default=3, help="Number of random contracts to evaluate (default: 3)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for selection (default: 42)")
    parser.add_argument("--mlx", action="store_true", help="Use local MLX model (otherwise runs quick dry-run keyword simulator)")
    parser.add_argument("--verbose", action="store_true", help="Print detailed gold standard vs predictions comparison")
    args = parser.parse_args()
    
    run_benchmark(num_samples=args.samples, seed=args.seed, use_mlx=args.mlx, verbose=args.verbose)
