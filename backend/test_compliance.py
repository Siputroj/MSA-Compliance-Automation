import os
import sys
import json
import argparse
from src.compliance_engine import ComplianceEngine, MLX_AVAILABLE

def print_result_card(result: dict):
    """Utility to print a clean rule evaluation card."""
    status = result.get("status", "UNKNOWN")
    severity = result.get("severity", "medium").upper()
    
    # Status coloring symbols
    if status == "COMPLIANT":
        status_icon = "✅ COMPLIANT"
    elif status == "WARNING":
        status_icon = "⚠️ WARNING"
    elif status == "NON_COMPLIANT":
        status_icon = "❌ NON_COMPLIANT"
    else:
        status_icon = "❓ NOT_FOUND"

    print(f"\nRule: {result.get('rule_id')} - {result.get('rule_name')} (Severity: {severity})")
    print(f"Status: {status_icon}")
    print(f"Explanation: {result.get('risk_explanation')}")
    if result.get("extracted_clause"):
        print(f"Extracted Sentence: \"{result.get('extracted_clause').strip()}\"")
    print("-" * 50)

def main():
    parser = argparse.ArgumentParser(description="MSA Compliance Automation - Backend Pipeline Test")
    parser.add_argument(
        "--mlx", 
        action="store_true", 
        help="Run actual MLX model local inference. If false, executes in fast dry-run simulation mode."
    )
    args = parser.parse_args()

    print("=" * 60)
    print("      MSA Compliance Automation - Backend Pipeline Test         ")
    print("=" * 60)
    
    print(f"System Check:")
    print(f"  - Apple MLX Library Available: {MLX_AVAILABLE}")
    
    # Configure engine based on --mlx flag
    if not args.mlx:
        print("\n[INFO] Running in DRY-RUN mode (Simulating Qwen's LLM response).")
        print("This verifies text parsing, chunking, and ChromaDB vector search instantly.")
        print("To run with actual MLX local GPU inference, run: python test_compliance.py --mlx")
        engine = ComplianceEngine(dry_run=True)
    else:
        if not MLX_AVAILABLE:
            print("\n[ERROR] MLX is not installed. Cannot run with --mlx. Running in DRY-RUN mode instead.")
            engine = ComplianceEngine(dry_run=True)
        else:
            print("\n[INFO] Running with active MLX local GPU inference.")
            engine = ComplianceEngine(dry_run=False)
            try:
                engine.load_model()
            except Exception as e:
                print(f"\n[ERROR] Failed to load model: {e}")
                print("Switching to DRY-RUN simulation...")
                engine = ComplianceEngine(dry_run=True)

    # Contract file paths
    compliant_path = "data/test_contracts/compliant_contract.txt"
    non_compliant_path = "data/test_contracts/non_compliant_contract.txt"

    # Verify files exist
    for path in [compliant_path, non_compliant_path]:
        if not os.path.exists(path):
            print(f"[ERROR] Test contract file not found: {path}")
            sys.exit(1)

    # 1. Evaluate Compliant Contract
    print("\n" + "#" * 60)
    print("  TESTING CONTRACT: Compliant MSA (compliant_contract.txt)")
    print("#" * 60)
    
    with open(compliant_path, "r", encoding="utf-8") as f:
        compliant_text = f.read()

    compliant_report = engine.analyze_contract_text("compliant_contract.txt", compliant_text)
    
    print(f"\nCompliance Summary:")
    print(f"  - Score: {compliant_report['compliance_summary']['score']}%")
    print(f"  - Rules Evaluated: {compliant_report['compliance_summary']['total_rules']}")
    print(f"  - Rules Passed: {compliant_report['compliance_summary']['passed']}")
    print(f"  - Rules Failed: {compliant_report['compliance_summary']['failed']}")
    
    print("\nDetailed Clause Evaluations:")
    print("-" * 50)
    for result in compliant_report["results"]:
        print_result_card(result)

    # 2. Evaluate Non-Compliant Contract
    print("\n" + "#" * 60)
    print("  TESTING CONTRACT: Non-Compliant MSA (non_compliant_contract.txt)")
    print("#" * 60)

    with open(non_compliant_path, "r", encoding="utf-8") as f:
        non_compliant_text = f.read()

    non_compliant_report = engine.analyze_contract_text("non_compliant_contract.txt", non_compliant_text)

    print(f"\nCompliance Summary:")
    print(f"  - Score: {non_compliant_report['compliance_summary']['score']}%")
    print(f"  - Rules Evaluated: {non_compliant_report['compliance_summary']['total_rules']}")
    print(f"  - Rules Passed: {non_compliant_report['compliance_summary']['passed']}")
    print(f"  - Rules Failed: {non_compliant_report['compliance_summary']['failed']}")

    print("\nDetailed Clause Evaluations:")
    print("-" * 50)
    for result in non_compliant_report["results"]:
        print_result_card(result)

    print("\n" + "=" * 60)
    print("Test Completed Successfully!")
    print("=" * 60)

if __name__ == "__main__":
    main()
