import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { logDiagnostic } from '../platform/diagnostics';

interface DataErrorBoundaryProps {
  children: ReactNode;
  /** Changing this value (for example the route) clears the error so the next screen can render. */
  resetKey?: string;
}

interface DataErrorBoundaryState {
  failed: boolean;
}

/**
 * Keeps one screen's failure, such as an unreadable record, from blanking the whole app.
 * Only the error's name is logged locally; no record content or message is kept.
 */
export class DataErrorBoundary extends Component<DataErrorBoundaryProps, DataErrorBoundaryState> {
  state: DataErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): DataErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    logDiagnostic({ level: 'error', event: 'render-error', error });
  }

  componentDidUpdate(previous: DataErrorBoundaryProps): void {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="card data-error" role="alert" aria-labelledby="data-error-heading">
        <h1 id="data-error-heading">This screen could not be shown</h1>
        <p>Some saved information may be unreadable. Nothing has been deleted. You can try this screen again, or open Data health in Settings to check your local records and download a backup.</p>
        <div className="recovery-actions">
          <button type="button" className="button button-primary" onClick={() => this.setState({ failed: false })}>Try this screen again</button>
          <Link className="button button-secondary" to="/settings#data-health">Open Data health</Link>
        </div>
      </section>
    );
  }
}
