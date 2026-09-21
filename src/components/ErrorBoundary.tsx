import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Red de seguridad: si el grid falla al renderizar, muestra fallback en vez de pantalla en blanco. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Intencionadamente silencioso: app local sin telemetría.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl bg-red-500/10 p-10 text-center ring-1 ring-red-400/30">
          <p className="font-semibold text-red-300">Algo falló al mostrar los juegos</p>
          <p className="mt-1 text-sm text-red-200/70">Prueba a recargar la página o limpiar los filtros.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-400/15 px-4 py-2 text-sm font-semibold text-red-200 ring-1 ring-red-400/30 hover:bg-red-400/25"
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
