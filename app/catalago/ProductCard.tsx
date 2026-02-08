'use client';
interface Props { product: any; }

export default function ProductCard({ product }: Props) {
  const openDialog = () =>
    (document.getElementById(`dlg-${product.id}`) as HTMLDialogElement).showModal();

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm cursor-pointer"
         onClick={openDialog}>
      {/* imagem */}
      <img src={product.image_url} alt={product.name}
           className="h-36 w-full object-cover" />

      {/* conteúdo */}
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-snug">
          {product.name}{product.volume && ` • ${product.volume}`}
        </h3>
        <p className="text-xs text-gray-500 mb-1">{product.category}</p>
        <span className="inline-block bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
          R$ {Number(product.price_consumer).toFixed(2)}
        </span>
      </div>

      {/* DIALOG (somente leitura) */}
      <dialog id={`dlg-${product.id}`} className="rounded-xl p-6 backdrop:bg-black/40">
        <h4 className="font-semibold text-lg mb-2">{product.name}</h4>

        {product.description && (
          <p className="text-sm mb-3">{product.description}</p>
        )}
        {product.how_to_use && (
          <>
            <h5 className="font-semibold mb-1">Passo a passo</h5>
            <p className="text-sm text-gray-700">{product.how_to_use}</p>
          </>
        )}

        <button onClick={() =>
          (document.getElementById(`dlg-${product.id}`) as HTMLDialogElement).close()
        }
        className="mt-4 w-full bg-black text-white py-2 rounded-lg">
          Fechar
        </button>
      </dialog>
    </div>
  );
}
