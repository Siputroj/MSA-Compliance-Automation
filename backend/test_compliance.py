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

    # Contract file path pointing to a real CUAD dataset contract
    contract_path = "cuad_data/CUAD_v1/full_contract_txt/Part_I/DOMINIADVISORTRUST_02_18_2005-EX-99.(H)(2)-SPONSORSHIP AGREEMENT.txt"
    contract_name = "DOMINIADVISORTRUST_02_18_2005-EX-99.(H)(2)-SPONSORSHIP AGREEMENT.txt"

    # Verify file exists
    if not os.path.exists(contract_path):
        print(f"[ERROR] CUAD contract file not found: {contract_path}")
        print("Please download and configure the CUAD dataset as described in the README.")
        sys.exit(1)

    print("\n" + "#" * 80)
    print(f"  TESTING REAL CONTRACT: {contract_name}")
    print("#" * 80)
    
    with open(contract_path, "r", encoding="utf-8") as f:
        contract_text = f.read()

    report = engine.analyze_contract_text(contract_name, contract_text)
    
    print(f"\nCompliance Summary:")
    print(f"  - Score: {report['compliance_summary']['score']}%")
    print(f"  - Rules Evaluated: {report['compliance_summary']['total_rules']}")
    print(f"  - Rules Passed: {report['compliance_summary']['passed']}")
    print(f"  - Rules Failed: {report['compliance_summary']['failed']}")
    
    print("\nDetailed Clause Evaluations:")
    print("-" * 80)
    for result in report["results"]:
        print_result_card(result)

    print("\n" + "=" * 80)
    print("Compliance Test Completed Successfully on CUAD Contract!")
    print("=" * 80)


if __name__ == "__main__":
    main()
