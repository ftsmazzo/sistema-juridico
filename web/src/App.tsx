import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { Dashboard } from "@/pages/Dashboard";
import { Prazos } from "@/pages/Prazos";
import { Publicacoes } from "@/pages/Publicacoes";
import { DetalhePublicacao } from "@/pages/DetalhePublicacao";
import { NovaPublicacao } from "@/pages/NovaPublicacao";
import { Pessoas } from "@/pages/Pessoas";
import { Usuarios } from "@/pages/Usuarios";
import { Login } from "@/pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="prazos" element={<Prazos />} />
          <Route path="publicacoes" element={<Publicacoes />} />
          <Route path="publicacoes/nova" element={<NovaPublicacao />} />
          <Route path="publicacoes/:id" element={<DetalhePublicacao />} />
          <Route path="pessoas" element={<Pessoas />} />
          <Route path="usuarios" element={<Usuarios />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
