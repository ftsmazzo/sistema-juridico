import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = getToken();
  if (!token && import.meta.env.PROD) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
