import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Prazos } from "@/pages/Prazos";
import { Publicacoes } from "@/pages/Publicacoes";
import { NovaPublicacao } from "@/pages/NovaPublicacao";
import { Login } from "@/pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="prazos" element={<Prazos />} />
          <Route path="publicacoes" element={<Publicacoes />} />
          <Route path="publicacoes/nova" element={<NovaPublicacao />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
