import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { Dashboard } from "@/pages/Dashboard";
import { Prazos } from "@/pages/Prazos";
import { Publicacoes } from "@/pages/Publicacoes";
import { DetalhePublicacao } from "@/pages/DetalhePublicacao";
import { NovaPublicacao } from "@/pages/NovaPublicacao";
import { TestarEmailRecorte } from "@/pages/TestarEmailRecorte";
import { Processos } from "@/pages/Processos";
import { DetalheProcesso } from "@/pages/DetalheProcesso";
import { Pessoas } from "@/pages/Pessoas";
import { Usuarios } from "@/pages/Usuarios";
import { Administracao } from "@/pages/Administracao";
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
          <Route path="publicacoes/testar-email" element={<TestarEmailRecorte />} />
          <Route path="publicacoes/:id" element={<DetalhePublicacao />} />
          <Route path="processos" element={<Processos />} />
          <Route path="processos/:id" element={<DetalheProcesso />} />
          <Route path="pessoas" element={<Pessoas />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="administracao" element={<Administracao />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
