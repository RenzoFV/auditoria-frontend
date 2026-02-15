const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorMessage = "Error en la respuesta del servidor";
    
    try {
      const errorData = await response.json();
      // FastAPI devuelve errores en el campo "detail"
      errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      // Si no es JSON, obtener como texto
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }
    }
    
    console.error(`API Error [${response.status}]:`, errorMessage);
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getDashboardSummary() {
  return fetchJson("/api/dashboard/summary");
}

export async function connectSqlServer(payload) {
  return fetchJson("/api/connect", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listStoredProcedures({
  connectionId,
  page = 1,
  limit = 100,
  schema,
  search,
}) {
  const params = new URLSearchParams({
    connection_id: connectionId,
    page: String(page),
    limit: String(limit),
  });

  if (schema) {
    params.set("schema", schema);
  }

  if (search) {
    params.set("search", search);
  }

  return fetchJson(`/api/stored-procedures?${params.toString()}`);
}

export async function analyzeStoredProcedures(payload) {
  return fetchJson("/api/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listDatabases(connectionId) {
  const params = new URLSearchParams({ connection_id: connectionId });
  return fetchJson(`/api/databases?${params.toString()}`);
}

export async function selectDatabase(connectionId, database) {
  return fetchJson(`/api/connections/${connectionId}/use-database`, {
    method: "POST",
    body: JSON.stringify({ database }),
  });
}

export async function generateEvidence(payload) {
  return fetchJson("/api/evidence", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateReport(payload) {
  return fetchJson("/api/reports/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listReports() {
  return fetchJson("/api/reports");
}
