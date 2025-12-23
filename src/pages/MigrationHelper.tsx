import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { migrateDataToSupabase } from "@/utils/migrateData";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";

const MigrationHelper = () => {
  const { t } = useTranslations();
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
          title: t.migration.successTitle,
          description: t.migration.successSummary
            .replace("{platos}", String(migrationResult.platosInserted))
            .replace("{platosLabel}", t.migration.platosLabel)
            .replace("{vinos}", String(migrationResult.vinosInserted))
            .replace("{vinosLabel}", t.migration.vinosLabel),
        });
      } else {
        toast({
          title: t.migration.errorTitle,
          description: migrationResult.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.migration.errorTitle,
        description: t.migration.errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
      <Card className="p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-4">{t.migration.title}</h1>
        <p className="text-muted-foreground text-center mb-6">
          {t.migration.description}
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
              {t.migration.loading}
            </>
          ) : (
            t.migration.start
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
                {result.success ? t.migration.successTitle : t.migration.errorTitle}
              </h3>
            </div>
            {result.success ? (
              <div className="text-sm space-y-1">
                <p>
                  ✅ {t.migration.successLine.replace("{count}", String(result.platosInserted)).replace("{label}", t.migration.platosLabel)}
                </p>
                <p>
                  ✅ {t.migration.successLine.replace("{count}", String(result.vinosInserted)).replace("{label}", t.migration.vinosLabel)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-500">{result.error}</p>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-primary hover:underline">
            {t.migration.back}
          </a>
        </div>
      </Card>
    </div>
  );
};

export default MigrationHelper;
