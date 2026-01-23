"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  // Este método é chamado quando um erro é lançado por um componente filho.
  // Ele retorna um valor para atualizar o estado, fazendo com que a próxima renderização
  // exiba a UI de fallback.
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  // Este método é chamado após um erro ser lançado.
  // É um bom lugar para registrar informações do erro em um serviço de log.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
    // Aqui você pode enviar o erro para um serviço de log externo (ex: Sentry)
  }

  public render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI de fallback personalizada
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md text-center shadow-lg">
            <CardHeader className="space-y-4">
              <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
              <CardTitle className="text-2xl font-bold">Ocorreu um Erro Inesperado!</CardTitle>
              <CardDescription className="text-muted-foreground">
                Parece que algo deu errado. Por favor, tente novamente mais tarde ou entre em contato com o suporte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => window.location.reload()} className="w-full">
                Recarregar Página
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.location.assign("/")}
              >
                <Home className="mr-2 h-4 w-4" />
                Ir para a Página Inicial
              </Button>
              {this.state.error && (
                <details className="mt-4 text-sm text-muted-foreground text-left p-2 border rounded-md bg-muted">
                  <summary className="cursor-pointer font-medium">Detalhes do Erro</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all text-xs">
                    {this.state.error.toString()}
                    <br />
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;