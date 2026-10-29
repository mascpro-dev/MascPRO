"use client";

import AdminSidebar from "@/componentes/AdminSidebar";
import CrmAtividadesCentral from "@/componentes/CrmAtividadesCentral";

export default function AdminCrmAtividadesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-8">
        <CrmAtividadesCentral leadHref={(id) => `/admin/crm/leads/${id}`} podeFiltrarResponsavel />
      </main>
    </div>
  );
}
