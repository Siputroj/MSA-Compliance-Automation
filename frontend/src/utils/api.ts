import { AuditReport, HealthStatus, Rule } from "@/types/compliance";

const API_BASE_URL = "http://localhost:8000/api";

/**
 * Checks backend health, MLX model availability, and dry-run state.
 */
export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health status check failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Retrieves the compliance rules loaded in backend.
 */
export async function getRules(): Promise<{ rules: Rule[] }> {
  const response = await fetch(`${API_BASE_URL}/rules`);
  if (!response.ok) {
    throw new Error(`Failed to fetch compliance rules: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Saves a new compliance rule or edits an existing one.
 */
export async function saveRule(rule: Rule): Promise<{ status: string; rules: Rule[] }> {
  const response = await fetch(`${API_BASE_URL}/rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rule),
  });

  if (!response.ok) {
    throw new Error(`Failed to save compliance rule: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Uploads a text file to evaluate compliance criteria.
 * @param file The contract .txt file to upload.
 */
export async function analyzeFile(file: File): Promise<AuditReport> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/analyze/file`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    // Attempt to extract detail from FastAPI error response
    let errorMessage = "File analysis request failed";
    try {
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // Fallback if not JSON
      errorMessage = `Server returned status ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
