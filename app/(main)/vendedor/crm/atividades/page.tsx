"use client";

import CrmAtividadesCentral from "@/componentes/CrmAtividadesCentral";

export default function VendedorCrmAtividadesPage() {
  return <CrmAtividadesCentral leadHref={(id) => `/vendedor/crm/leads/${id}`} />;
}
