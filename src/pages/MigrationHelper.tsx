import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { migrateDataToSupabase } from "@/utils/migrateData";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const MigrationHelper = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const migrationResult = await migrateDataToSupabase();
      setResult(migrationResult);
      
      if (migrationResult.success) {
        toast({
          title: "¡Migración exitosa!",
          description: `Se han migrado ${migrationResult.platosInserted} platos y ${migrationResult.vinosInserted} vinos`,
        });
      } else {
        toast({
          title: "Error en la migración",
          description: migrationResult.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al ejecutar la migración",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
      <Card className="p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-4">Migración de Datos</h1>
        <p className="text-muted-foreground text-center mb-6">
          Migra los datos de la carta y vinos del JSON a la base de datos
        </p>

        <Button
          onClick={handleMigration}
          disabled={isLoading}
          className="w-full mb-4"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Migrando datos...
            </>
          ) : (
            "Iniciar Migración"
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <h3 className="font-semibold">
                {result.success ? '¡Migración exitosa!' : 'Error en la migración'}
              </h3>
            </div>
            {result.success ? (
              <div className="text-sm space-y-1">
                <p>✅ {result.platosInserted} platos migrados</p>
                <p>✅ {result.vinosInserted} vinos migrados</p>
              </div>
            ) : (
              <p className="text-sm text-red-500">{result.error}</p>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-primary hover:underline">
            Volver al inicio
          </a>
        </div>
      </Card>
    </div>
  );
};

export default MigrationHelper;
