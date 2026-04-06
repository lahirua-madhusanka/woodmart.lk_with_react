import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function PrivateRoute({ children }) {
  const { isAuthenticated, loading, token, authCheckFailed, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container-pad py-20 text-center text-muted">
        Loading your account...
      </div>
    );
  }

  if (!isAuthenticated && token && authCheckFailed) {
    return (
      <div className="container-pad py-20 text-center text-muted">
        <p>We are reconnecting to your account session...</p>
        <button
          type="button"
          onClick={() => refreshProfile().catch(() => {})}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default PrivateRoute;
