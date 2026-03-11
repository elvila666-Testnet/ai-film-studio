import json
import os

def generate_coo_report(original_prompt, expanded_prompt, visual_analysis):
    report = f"""
    # COO STRATEGIC REPORT: COORDINATION AUDIT
    
    ## 1. EXECUTIVE SUMMARY
    - Original Intent: {original_prompt[:50]}...
    - System Coordination Score: {calculate_score(original_prompt, visual_analysis)}/10
    
    ## 2. DEEP DIVE
    - **User Request:** {original_prompt}
    - **Director Expansion:** {expanded_prompt}
    - **Visual Reality:** {visual_analysis}
    
    ## 3. COO ACTIONABLE ADJUSTMENTS
    - [ ] Optimizar Prompt del Director para: {identify_weakness(visual_analysis)}
    - [ ] Revisar consistencia de color en el modelo de imagen.
    """
    with open("COO_REPORT.md", "w") as f:
        f.write(report)

def calculate_score(orig, vision):
    # Lógica simple de coincidencia de palabras clave
    common = set(orig.lower().split()) & set(vision.lower().split())
    return len(common) / len(set(orig.lower().split())) * 10

# El agente llama a esta función al terminar su ciclo
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 3:
        original = sys.argv[1]
        expanded = sys.argv[2]
        analysis = sys.argv[3]
        generate_coo_report(original, expanded, analysis)
        print("COO_REPORT.md generated successfully.")
    else:
        print("Usage: python process_audit.py <original_prompt> <expanded_prompt> <visual_analysis>")
