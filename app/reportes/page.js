"use client";

import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Calendar, Database } from "lucide-react";

export default function ReportesPage() {
  const router = useRouter();
  const [reportes, setReportes] = useState(() => {
    // Inicializar con datos del sessionStorage si existen
    if (typeof window !== "undefined") {
      const storedReport = sessionStorage.getItem("latestReport");
      const analysisResult = sessionStorage.getItem("analysisResult");
      
      if (storedReport) {
        const report = JSON.parse(storedReport);
        const analysis = analysisResult ? JSON.parse(analysisResult) : null;
        
        return [{
          ...report,
          analysisData: analysis
        }];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  const handleDownload = async (filePath, format) => {
    try {
      // Normalizar el path y extraer solo el nombre del archivo
      // Soportar tanto / como \ como separadores
      const normalizedPath = filePath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Determinar el tipo de carpeta según el formato
      const fileType = format === 'json' ? 'jsons' : format === 'pdf' ? 'pdfs' : 'excels';
      
      // Crear URL del endpoint de descarga (solo con el nombre del archivo)
      const downloadUrl = `http://localhost:8000/download/${fileType}/${fileName}`;
      
      console.log('Descargando:', downloadUrl);
      
      // Usar fetch para descargar el archivo
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }
      
      // Convertir la respuesta a blob
      const blob = await response.blob();
      
      // Crear URL temporal del blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Crear enlace temporal y simular clic
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
    } catch (error) {
      console.error('Error descargando archivo:', error);
      alert('Error al descargar el archivo. Por favor, intenta nuevamente.');
    }
  };

  const handleNavItemClick = (itemLabel) => {
    if (itemLabel === "Panel") {
      router.push("/");
    }
    // Aquí puedes agregar más navegaciones
  };

  const handleBackToPanel = () => {
    router.push("/");
  };

  return (
    <SidebarLayout onNavItemClick={handleNavItemClick}>
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Reportes de Auditoría</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona y descarga los reportes generados
            </p>
          </div>
          <Button variant="outline" onClick={handleBackToPanel}>
            Volver al Panel
          </Button>
        </div>

        {reportes.length === 0 ? (
          <Card className="border-border/60 bg-white/80">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground/50" />
              <h3 className="mt-4 font-semibold">No hay reportes disponibles</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ejecuta un análisis y genera un reporte desde el panel principal
              </p>
              <Button className="mt-4" onClick={handleBackToPanel}>
                Ir al Panel Principal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {reportes.map((reporte, index) => (
              <Card key={index} className="border-border/60 bg-white/80">
                <CardHeader>
                  <CardTitle className="font-display text-xl">
                    Reporte de Auditoría
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Resumen ejecutivo */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h3 className="font-semibold text-blue-900">📊 Resumen Ejecutivo</h3>
                    <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded-md bg-white p-3">
                        <p className="text-xs text-muted-foreground">Total Hallazgos</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {reporte.analysisData?.findings?.length || 0}
                        </p>
                      </div>
                      <div className="rounded-md bg-white p-3">
                        <p className="text-xs text-muted-foreground">Críticos</p>
                        <p className="text-2xl font-bold text-red-600">
                          {reporte.analysisData?.findings_summary?.critical || 0}
                        </p>
                      </div>
                      <div className="rounded-md bg-white p-3">
                        <p className="text-xs text-muted-foreground">Altos</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {reporte.analysisData?.findings_summary?.high || 0}
                        </p>
                      </div>
                      <div className="rounded-md bg-white p-3">
                        <p className="text-xs text-muted-foreground">SPs Analizados</p>
                        <p className="text-2xl font-bold text-green-600">
                          {reporte.analysisData?.analyzed_count || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Información del reporte */}
                  <div className="space-y-4">
                    <Separator />
                    <h3 className="font-semibold">📄 Detalles del Reporte</h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">Formato</p>
                        <p className="font-medium uppercase">
                          {reporte.format || reporte.report_type || "JSON"}
                        </p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">Fecha de generación</p>
                        <p className="text-sm">
                          {new Date().toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">Estado</p>
                        <Badge variant="secondary">Completado</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Hallazgos detallados */}
                  {reporte.analysisData?.findings && (
                    <div className="space-y-4">
                      <Separator />
                      <h3 className="font-semibold">🔍 Hallazgos Detallados</h3>
                      <div className="space-y-3">
                        {reporte.analysisData.findings.slice(0, 10).map((finding, idx) => (
                          <div
                            key={`finding-${idx}`}
                            className="rounded-lg border bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      finding.severity === "critical" || finding.severity === "high"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {finding.severity}
                                  </Badge>
                                  <h4 className="font-semibold">{finding.title}</h4>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {finding.sp_name} · {finding.category}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-3 space-y-2">
                              <div>
                                <p className="text-sm font-medium">Descripción:</p>
                                <p className="text-sm text-muted-foreground">
                                  {finding.description || "Sin descripción"}
                                </p>
                              </div>
                              
                              {finding.recommendation && (
                                <div>
                                  <p className="text-sm font-medium">Recomendación:</p>
                                  <p className="text-sm text-muted-foreground">
                                    {finding.recommendation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {reporte.analysisData.findings.length > 10 && (
                          <p className="text-center text-sm text-muted-foreground">
                            ... y {reporte.analysisData.findings.length - 10} hallazgos más
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Descargas */}
                  <div className="space-y-4">
                    <Separator />
                    <h3 className="font-semibold">💾 Descargar Reporte</h3>
                    <div className="flex flex-wrap gap-3">
                      {reporte.file_path && (
                        <Button 
                          variant="default"
                          onClick={() => handleDownload(
                            reporte.file_path, 
                            reporte.format || reporte.report_type || "json"
                          )}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Descargar {(reporte.format || reporte.report_type || "reporte").toUpperCase()}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reporte.format === "json" || reporte.report_type === "json" 
                        ? "El reporte JSON contiene todos los detalles técnicos del análisis."
                        : reporte.format === "pdf" || reporte.report_type === "pdf"
                        ? "El reporte PDF incluye un documento formateado listo para presentaciones."
                        : reporte.format === "excel" || reporte.report_type === "excel"
                        ? "El reporte Excel contiene tablas y gráficos para análisis detallado."
                        : "Haz clic en el botón de arriba para descargar el reporte."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </SidebarLayout>
  );
}
