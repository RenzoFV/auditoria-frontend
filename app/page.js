"use client";

import { AlertTriangle, Database, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/dashboard/sidebar-07";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  analyzeStoredProcedures,
  connectSqlServer,
  generateEvidence,
  generateReport,
  listDatabases,
  listStoredProcedures,
  selectDatabase,
} from "@/lib/api";

const connectionTypes = [
  { value: "sql_auth", label: "SQL Auth" },
  { value: "windows_auth", label: "Windows Auth" },
  { value: "azure_ad", label: "Azure AD" },
];

const analysisTypes = [
  { value: "full", label: "Completo" },
  { value: "quick", label: "Rapido" },
];

export default function Home() {
  const router = useRouter();
  const [connectionForm, setConnectionForm] = useState({
    connection_type: "sql_auth",
    server: "",
    username: "",
    password: "",
    port: 1433,
  });
  const [connectionId, setConnectionId] = useState("");
  const [databaseInfo, setDatabaseInfo] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [databasesLoading, setDatabasesLoading] = useState(false);
  const [databasesError, setDatabasesError] = useState("");

  const [searchValue, setSearchValue] = useState("");
  const [storedProcedures, setStoredProcedures] = useState([]);
  const [storedProceduresTotal, setStoredProceduresTotal] = useState(0);
  const [storedProceduresLoading, setStoredProceduresLoading] = useState(false);
  const [storedProceduresError, setStoredProceduresError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedSpIds, setSelectedSpIds] = useState([]);
  const [analysisType, setAnalysisType] = useState("full");
  const [useAi, setUseAi] = useState(true);
  const [saveToDb, setSaveToDb] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [findingOpen, setFindingOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [generatedReport, setGeneratedReport] = useState(null);
  const [findingsPage, setFindingsPage] = useState(1);
  const findingsPerPage = 5;

  const isSqlAuth = connectionForm.connection_type === "sql_auth";

  const selectedCount = selectedSpIds.length;

  const allSelected =
    storedProcedures.length > 0 &&
    storedProcedures.every((sp) => selectedSpIds.includes(sp.id));

  const findingsBySeverity = useMemo(() => {
    const summary = analysisResult?.findings_summary;
    if (!summary) {
      return [];
    }
    return [
      { label: "critical", value: summary.critical ?? 0 },
      { label: "high", value: summary.high ?? 0 },
      { label: "medium", value: summary.medium ?? 0 },
      { label: "low", value: summary.low ?? 0 },
      { label: "info", value: summary.info ?? 0 },
    ];
  }, [analysisResult]);

  // Paginación de SPs
  const paginatedSps = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return storedProcedures.slice(startIndex, endIndex);
  }, [storedProcedures, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(storedProcedures.length / itemsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Paginación de hallazgos
  const paginatedFindings = useMemo(() => {
    if (!analysisResult?.findings) return [];
    const startIndex = (findingsPage - 1) * findingsPerPage;
    const endIndex = startIndex + findingsPerPage;
    return analysisResult.findings.slice(startIndex, endIndex);
  }, [analysisResult?.findings, findingsPage, findingsPerPage]);

  const totalFindingsPages = Math.ceil((analysisResult?.findings?.length || 0) / findingsPerPage);

  const handlePreviousFindingsPage = () => {
    setFindingsPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextFindingsPage = () => {
    setFindingsPage((prev) => Math.min(prev + 1, totalFindingsPages));
  };

  useEffect(() => {
    setConnectionStatus("UI lista");
  }, []);

  const handleConnectionChange = (field, value) => {
    setConnectionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    if (!connectionForm.server.trim()) {
      setConnectionError("Ingresa el servidor antes de conectar.");
      setConnectionStatus("Sin servidor");
      return;
    }

    if (isSqlAuth && (!connectionForm.username || !connectionForm.password)) {
      setConnectionError("Usuario y contrasena son requeridos para SQL Auth.");
      setConnectionStatus("Credenciales incompletas");
      return;
    }

    setConnectionError("");
    setConnectionStatus("Conectando...");
    setConnecting(true);
    setAnalysisResult(null);
    setStoredProcedures([]);
    setStoredProceduresTotal(0);
    setSelectedSpIds([]);
    setDatabases([]);
    setSelectedDatabase("");
    setDatabasesError("");

    try {
      const payload = {
        connection_type: connectionForm.connection_type,
        server: connectionForm.server,
        username: isSqlAuth ? connectionForm.username : null,
        password: isSqlAuth ? connectionForm.password : null,
        port: Number(connectionForm.port || 1433),
      };

      const response = await connectSqlServer(payload);
      setConnectionId(response.connection_id);
      setDatabaseInfo(response.database_info);
      setConnectionStatus("Conexion establecida");
      setDatabasesLoading(true);
      try {
        const dbResponse = await listDatabases(response.connection_id);
        setDatabases(dbResponse.databases || []);
      } catch (dbError) {
        setDatabasesError("No se pudieron cargar las bases disponibles.");
      }
    } catch (error) {
      setConnectionError(
        error?.message ||
          "No se pudo conectar. Verifica credenciales y estado del servidor."
      );
      setConnectionStatus("Error de conexion");
      setConnectionId("");
      setDatabaseInfo(null);
    } finally {
      setConnecting(false);
      setDatabasesLoading(false);
    }
  };

  const handleConnectClick = () => {
    console.log("click detectado");
    setConnectionStatus("Click detectado");
    handleConnect();
  };

  const loadStoredProcedures = async (databaseOverride) => {
    if (!connectionId) {
      setStoredProceduresError("Primero conecta con la base de datos.");
      return;
    }

    if (!databaseOverride && !selectedDatabase) {
      setStoredProceduresError("Selecciona una base de datos primero.");
      return;
    }

    setStoredProceduresLoading(true);
    setStoredProceduresError("");
    setStoredProcedures([]);
    setSelectedSpIds([]);
    setCurrentPage(1);

    try {
      const backendPageSize = 500;
      const response = await listStoredProcedures({
        connectionId,
        page: 1,
        limit: backendPageSize,
        search: searchValue || undefined,
      });

      const total = response.total || 0;
      const allSps = [...(response.stored_procedures || [])];
      const totalBackendPages = Math.ceil(total / backendPageSize);

      for (let page = 2; page <= totalBackendPages; page += 1) {
        const nextPage = await listStoredProcedures({
          connectionId,
          page,
          limit: backendPageSize,
          search: searchValue || undefined,
        });
        allSps.push(...(nextPage.stored_procedures || []));
      }

      setStoredProcedures(allSps);
      setStoredProceduresTotal(total);
    } catch (error) {
      setStoredProceduresError("No se pudo cargar la lista de SPs.");
    } finally {
      setStoredProceduresLoading(false);
    }
  };

  const handleSelectDatabase = async (database) => {
    if (!connectionId) {
      return;
    }

    setSelectedDatabase(database);
    setDatabasesError("");

    try {
      const response = await selectDatabase(connectionId, database);
      setDatabaseInfo(response.database_info);
      loadStoredProcedures(database);
    } catch (error) {
      setDatabasesError("No se pudo seleccionar la base de datos.");
    }
  };

  const handleLoadStoredProcedures = async () => {
    await loadStoredProcedures();
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedSpIds([]);
      return;
    }
    setSelectedSpIds(storedProcedures.map((sp) => sp.id));
  };

  const handleToggleSp = (spId) => {
    setSelectedSpIds((prev) =>
      prev.includes(spId) ? prev.filter((id) => id !== spId) : [...prev, spId]
    );
  };

  const handleAnalyze = async () => {
    if (!connectionId || selectedSpIds.length === 0) {
      setAnalysisError("Selecciona al menos un SP para analizar.");
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisResult(null);

    try {
      const response = await analyzeStoredProcedures({
        connection_id: connectionId,
        sp_ids: selectedSpIds,
        analysis_type: analysisType,
        use_ai: useAi,
        save_to_db: saveToDb,
      });
      setAnalysisResult(response);
    } catch (error) {
      setAnalysisError("No se pudo ejecutar el analisis.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleOpenFinding = (finding) => {
    setSelectedFinding(finding);
    setFindingOpen(true);
  };

  const handleOpenEvidence = () => {
    setEvidenceOpen(true);
  };

  const handleRunEvidence = async (finding) => {
    // Validación de datos requeridos
    if (!connectionId) {
      setEvidenceError("No hay conexión activa a la base de datos.");
      return;
    }

    if (!finding) {
      setEvidenceError("No se pudo identificar el hallazgo.");
      return;
    }

    if (!finding.sp_id) {
      setEvidenceError("El hallazgo no tiene un ID de stored procedure asociado.");
      console.error("Finding sin sp_id:", finding);
      return;
    }

    if (!finding.type) {
      setEvidenceError("El hallazgo no tiene tipo especificado.");
      console.error("Finding sin type:", finding);
      return;
    }

    setEvidenceLoading(true);
    setEvidenceError("");

    try {
      console.log("Enviando request de evidencia:", {
        connection_id: connectionId,
        sp_id: finding.sp_id,
        finding_type: finding.type,
        code_snippet: finding.location?.code_snippet || "",
      });

      const response = await generateEvidence({
        connection_id: connectionId,
        sp_id: finding.sp_id,
        finding_type: finding.type,
        code_snippet: finding.location?.code_snippet || "",
      });

      const updatedFinding = {
        ...finding,
        evidence_data: response.evidence_data,
        records_preview: response.evidence_data?.records_preview || [],
        records_source: response.evidence_data?.records_source || null,
      };

      setSelectedFinding(updatedFinding);
      setAnalysisResult((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          findings: prev.findings.map((item) =>
            item.id === finding.id ? updatedFinding : item
          ),
        };
      });

      setEvidenceOpen(true);
    } catch (error) {
      console.error("Error generando evidencia:", error);
      
      let errorMsg = error?.message || "No se pudo generar evidencia real para este hallazgo.";
      
      // Mensaje más claro si es problema de conexión
      if (errorMsg.includes("Conexión") || errorMsg.includes("conexión")) {
        errorMsg = "⚠️ Conexión perdida. Por favor, reconecta a la base de datos desde el paso 1 antes de generar evidencia.";
      }
      
      setEvidenceError(errorMsg);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleGenerateReport = async (format = "json") => {
    if (!analysisResult?.analysis_id) {
      setReportError("No hay análisis disponible para generar reporte.");
      return;
    }

    setReportLoading(true);
    setReportError("");

    try {
      const response = await generateReport({
        analysis_id: analysisResult.analysis_id,
        format: format,
        include_code: true,
        include_recommendations: true,
        analysis_data: analysisResult, // Enviar los datos del análisis
      });

      setGeneratedReport(response);
      
      // Guardar en sessionStorage y navegar
      sessionStorage.setItem("latestReport", JSON.stringify(response));
      sessionStorage.setItem("analysisResult", JSON.stringify(analysisResult));
      router.push("/reportes");
    } catch (error) {
      console.error("Error generando reporte:", error);
      setReportError(error?.message || "No se pudo generar el reporte.");
    } finally {
      setReportLoading(false);
    }
  };

  const handleNavItemClick = (itemLabel) => {
    // La navegación ahora se maneja automáticamente en el sidebar
  };

  return (
    <SidebarLayout onNavItemClick={handleNavItemClick}>
      <section className="grid gap-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/60 bg-white/80">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                1. Conexion a base de datos
              </CardTitle>
              <CardDescription>
                Conecta mediante SQL Auth, Windows Auth o Azure AD
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Metodo de conexion
                  </p>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={connectionForm.connection_type}
                    onChange={(event) =>
                      handleConnectionChange("connection_type", event.target.value)
                    }
                  >
                    {connectionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Servidor
                  </p>
                  <Input
                    placeholder="localhost o IP"
                    value={connectionForm.server}
                    onChange={(event) =>
                      handleConnectionChange("server", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Puerto
                  </p>
                  <Input
                    type="number"
                    value={connectionForm.port}
                    onChange={(event) =>
                      handleConnectionChange("port", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Usuario
                  </p>
                  <Input
                    placeholder="Usuario SQL"
                    value={connectionForm.username}
                    onChange={(event) =>
                      handleConnectionChange("username", event.target.value)
                    }
                    disabled={!isSqlAuth}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Contrasena
                  </p>
                  <Input
                    type="password"
                    placeholder="********"
                    value={connectionForm.password}
                    onChange={(event) =>
                      handleConnectionChange("password", event.target.value)
                    }
                    disabled={!isSqlAuth}
                  />
                </div>
              </div>
              {connectionError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {connectionError}
                </div>
              ) : null}
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Base de datos
                </p>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedDatabase}
                  onChange={(event) => handleSelectDatabase(event.target.value)}
                  disabled={!connectionId || databasesLoading}
                >
                  <option value="" disabled>
                    {databasesLoading
                      ? "Cargando bases..."
                      : "Selecciona una base"}
                  </option>
                  {databases.map((database) => (
                    <option key={database} value={database}>
                      {database}
                    </option>
                  ))}
                </select>
                {databasesError ? (
                  <div className="text-sm text-destructive">{databasesError}</div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    {connectionId
                      ? `Conexion activa: ${connectionId.slice(0, 8)}...`
                      : "Sin conexion activa"}
                  </span>
                </div>
                <button
                  type="button"
                  className="relative z-10 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                  onClick={handleConnectClick}
                  disabled={connecting}
                >
                  {connecting ? "Conectando..." : "Conectar"}
                </button>
              </div>
              {connectionStatus ? (
                <div className="text-xs text-muted-foreground">
                  Estado: {connectionStatus}
                </div>
              ) : null}
              {databaseInfo ? (
                <div className="rounded-lg border border-border/60 bg-white/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{databaseInfo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {databaseInfo.server} · {databaseInfo.version}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {databaseInfo.total_sps} SPs
                    </Badge>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">2. Extraer SPs</CardTitle>
              <CardDescription>
                Lista y selecciona los stored procedures a analizar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar stored procedure"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleLoadStoredProcedures}
                  disabled={storedProceduresLoading}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {storedProceduresError ? (
                <div className="text-sm text-destructive">
                  {storedProceduresError}
                </div>
              ) : null}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total SPs: {storedProceduresTotal}</span>
                <Button variant="ghost" size="sm" onClick={handleLoadStoredProcedures}>
                  {storedProceduresLoading ? "Cargando..." : "Refrescar"}
                </Button>
              </div>
              {storedProcedures.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No hay SPs cargados.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleToggleSelectAll}
                      />
                      <span className="text-sm">Seleccionar todos</span>
                    </div>
                    <Badge variant="secondary">{selectedCount} seleccionados</Badge>
                  </div>
                  <div className="max-h-[360px] space-y-2 overflow-auto pr-2">
                    {paginatedSps.map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-start gap-3 rounded-md border border-border/60 p-3"
                      >
                        <Checkbox
                          checked={selectedSpIds.includes(sp.id)}
                          onCheckedChange={() => handleToggleSp(sp.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{sp.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Lineas: {sp.line_count} · Schema: {sp.schema}
                          </p>
                        </div>
                        {sp.is_analyzed ? (
                          <Badge variant="outline">Analizado</Badge>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {storedProcedures.length > itemsPerPage && (
                    <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/50 px-3 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/60 bg-white/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                3. Analizar con IA
              </CardTitle>
              <CardDescription>
                Ejecuta el analisis y obtiene el diagnostico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Tipo de analisis
                  </p>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={analysisType}
                    onChange={(event) => setAnalysisType(event.target.value)}
                  >
                    {analysisTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Opciones
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={useAi} onCheckedChange={setUseAi} />
                      Usar Gemini AI
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={saveToDb} onCheckedChange={setSaveToDb} />
                      Guardar en Supabase
                    </label>
                  </div>
                </div>
              </div>
              {analysisError ? (
                <div className="text-sm text-destructive">{analysisError}</div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  SPs seleccionados: {selectedCount}
                </div>
                <Button onClick={handleAnalyze} disabled={analysisLoading}>
                  {analysisLoading ? "Analizando..." : "Iniciar analisis"}
                </Button>
              </div>
              {analysisResult ? (
                <div className="rounded-lg border border-border/60 bg-white/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Resultado</p>
                      <p className="text-xs text-muted-foreground">
                        Analisis: {analysisResult.analysis_id}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {analysisResult.analyzed_count} SPs
                    </Badge>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    {findingsBySeverity.map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-primary" />
                          <span className="text-sm capitalize">{item.label}</span>
                        </div>
                        <Badge variant="outline">{item.value}</Badge>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Generar Reportes</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => handleGenerateReport("json")}
                        disabled={reportLoading}
                        variant="default"
                        size="sm"
                      >
                        {reportLoading ? "..." : "JSON"}
                      </Button>
                      <Button
                        onClick={() => handleGenerateReport("pdf")}
                        disabled={reportLoading}
                        variant="default"
                        size="sm"
                      >
                        {reportLoading ? "..." : "PDF"}
                      </Button>
                      <Button
                        onClick={() => handleGenerateReport("excel")}
                        disabled={reportLoading}
                        variant="default"
                        size="sm"
                      >
                        {reportLoading ? "..." : "Excel"}
                      </Button>
                    </div>
                    {reportError ? (
                      <span className="text-xs text-destructive">
                        {reportError}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Diagnostico y hallazgos
              </CardTitle>
              <CardDescription>
                Lista resumida de hallazgos detectados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysisResult?.findings?.length ? (
                <div className="space-y-3">
                  {paginatedFindings.map((finding, index) => (
                    <div
                      key={`${finding.sp_name || "sp"}-${finding.id || "finding"}-${
                        finding.location?.line ?? index
                      }`}
                      className="rounded-md border border-border/60 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{finding.title}</p>
                        <button
                          type="button"
                          onClick={() => handleOpenFinding(finding)}
                          className="rounded-full"
                        >
                          <Badge variant="outline">{finding.severity}</Badge>
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {finding.sp_name} · {finding.category}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Linea {finding.location?.line ?? "-"}
                      </p>
                    </div>
                  ))}
                  {analysisResult.findings.length > findingsPerPage && (
                    <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/50 px-3 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousFindingsPage}
                        disabled={findingsPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Página {findingsPage} de {totalFindingsPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextFindingsPage}
                        disabled={findingsPage === totalFindingsPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Ejecuta un analisis para ver los hallazgos.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={findingOpen} onOpenChange={setFindingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedFinding?.title || "Detalle de vulnerabilidad"}
            </DialogTitle>
            <DialogDescription>
              {selectedFinding
                ? `${selectedFinding.severity} · ${selectedFinding.category}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedFinding ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Descripcion</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFinding.description ||
                    "No se proporciono una descripcion detallada para este hallazgo."}
                </p>
              </div>
              {selectedFinding.impact ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Impacto</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFinding.impact}
                  </p>
                </div>
              ) : null}
              {selectedFinding.recommendation ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Recomendacion</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFinding.recommendation}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleRunEvidence(selectedFinding)}
                  disabled={evidenceLoading}
                >
                  {evidenceLoading ? "Analizando..." : "Analizar datos reales"}
                </Button>
                {evidenceError ? (
                  <span className="text-xs text-destructive">
                    {evidenceError}
                  </span>
                ) : null}
                {selectedFinding.evidence_data?.masked_samples?.length ? (
                  <Button type="button" variant="outline" onClick={handleOpenEvidence}>
                    Ver datos comprometidos
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Zonas vulnerables</p>
                {selectedFinding.location?.code_snippet || selectedFinding.evidence ? (
                  <pre className="max-h-56 overflow-auto rounded-md border bg-muted p-3 text-xs">
                    <code>
                      {selectedFinding.location?.code_snippet || selectedFinding.evidence}
                    </code>
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No se encontro un fragmento marcado para este hallazgo.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Evidencia de vulnerabilidad</DialogTitle>
            <DialogDescription>
              Análisis específico con datos reales (enmascarados para seguridad)
            </DialogDescription>
          </DialogHeader>
          {selectedFinding?.evidence_data ? (
            <div className="mt-4 space-y-4">
              {/* Contexto específico de la vulnerabilidad */}
              {selectedFinding.evidence_data.vulnerability_context ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    🎯 {selectedFinding.evidence_data.vulnerability_context.type}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-amber-800">
                    {selectedFinding.evidence_data.vulnerability_context.vulnerable_parameters?.length ? (
                      <p>
                        <strong>Parámetros vulnerables:</strong> @
                        {selectedFinding.evidence_data.vulnerability_context.vulnerable_parameters.join(", @")}
                      </p>
                    ) : null}
                    {selectedFinding.evidence_data.vulnerability_context.affected_columns?.length ? (
                      <p>
                        <strong>Columnas afectadas:</strong>{" "}
                        {selectedFinding.evidence_data.vulnerability_context.affected_columns.join(", ")}
                      </p>
                    ) : null}
                    {selectedFinding.evidence_data.vulnerability_context.password_columns_found?.length ? (
                      <p>
                        <strong>Contraseñas expuestas en:</strong>{" "}
                        {selectedFinding.evidence_data.vulnerability_context.password_columns_found.join(", ")}
                      </p>
                    ) : null}
                    {selectedFinding.evidence_data.vulnerability_context.exposed_columns?.length ? (
                      <p>
                        <strong>Datos sensibles expuestos:</strong>{" "}
                        {selectedFinding.evidence_data.vulnerability_context.exposed_columns.join(", ")}
                      </p>
                    ) : null}
                    {selectedFinding.evidence_data.vulnerability_context.operation ? (
                      <p>
                        <strong>Operación vulnerable:</strong>{" "}
                        {selectedFinding.evidence_data.vulnerability_context.operation}
                      </p>
                    ) : null}
                    {selectedFinding.evidence_data.vulnerability_context.total_passwords_exposed ? (
                      <p>
                        <strong>Total contraseñas en texto plano:</strong>{" "}
                        {selectedFinding.evidence_data.vulnerability_context.total_passwords_exposed}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Escenario de ataque */}
              {selectedFinding.evidence_data.attack_scenario ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">⚠️ Escenario de explotación</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {selectedFinding.evidence_data.attack_scenario}
                  </p>
                </div>
              ) : null}

              {/* Conteo de registros */}
              {selectedFinding.evidence_data.record_counts?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">📊 Impacto cuantificado</p>
                  <div className="space-y-2">
                    {selectedFinding.evidence_data.record_counts.map((item) => (
                      <div key={item.table} className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                        <p className="font-semibold">{item.table}</p>
                        <p className="mt-1 text-muted-foreground">
                          <strong>Total registros expuestos:</strong> {item.total_records ?? 0}
                        </p>
                        {item.columns_affected?.length ? (
                          <p className="mt-1 text-muted-foreground">
                            <strong>Columnas comprometibles:</strong> {item.columns_affected.join(", ")}
                          </p>
                        ) : null}
                        {item.sensitive_counts && Object.keys(item.sensitive_counts).length ? (
                          <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
                            <p className="font-semibold text-destructive">Datos sensibles:</p>
                            {Object.entries(item.sensitive_counts).map(
                              ([col, metrics]) => (
                                <p key={col} className="text-muted-foreground">
                                  • {col}: {metrics.distinct ?? 0} valores únicos, {metrics.non_null ?? 0} registros no nulos
                                </p>
                              )
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Muestra de datos comprometidos */}
              {selectedFinding?.evidence_data?.masked_samples?.length ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">🔍 Muestra de datos comprometidos (enmascarados)</p>
                  {selectedFinding.evidence_data.masked_samples.map((sample) => (
                    <div key={sample.table} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{sample.table}</p>
                      {sample.rows?.length ? (
                        <div className="max-h-80 overflow-auto rounded-md border">
                          <table className="w-full text-xs">
                            <thead className="bg-muted">
                              <tr>
                                {Object.keys(sample.rows[0]).map((key) => (
                                  <th
                                    key={key}
                                    className="whitespace-nowrap px-3 py-2 text-left font-semibold"
                                  >
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sample.rows.slice(0, 5).map((row, index) => (
                                <tr key={`evidence-row-${index}`} className="border-t hover:bg-muted/40">
                                  {Object.keys(sample.rows[0]).map((key) => (
                                    <td key={key} className="px-3 py-2">
                                      {row?.[key] ?? "-"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {sample.rows.length > 5 && (
                            <div className="bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
                              ... y {sample.rows.length - 5} registros más
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No hay registros disponibles para mostrar.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No hay evidencia disponible. Pulsa &quot;Analizar datos reales&quot; para generar el análisis.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
