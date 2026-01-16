import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Bem-vindo</h2>
          <p className="text-slate-400 text-sm mt-1">
            Entre com suas credenciais de membro.
          </p>
        </div>

        {/* Espaço para o Form do Supabase depois */}
        <div className="py-8 border-y border-slate-800 text-slate-500 text-sm">
          [Formulário de Login virá aqui]
        </div>

        <div className="pt-4">
          <p className="text-xs text-slate-500 mb-4">
            Não tem convite? O acesso é restrito.
          </p>
          <Link 
            href="https://wa.me/5514991570389?text=Gostaria%20de%20solicitar%20acesso%20ao%20MASC%20PRO"
            target="_blank"
            className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors text-sm uppercase tracking-wide"
          >
            Pedir Link no WhatsApp
          </Link>
        </div>
      </div>
    </div>
  );
}