'use client';
interface Props { product: any; }

export default function ProductCard({ product }: Props) {
  const open = () =>
    (document.getElementById(`dlg-${product.id}`) as HTMLDialogElement).showModal();

  return (
    <div
      className="relative h-52 md:h-[340px] w-full select-none cursor-pointer"
      onClick={open}
    >
      {/* IMG */}
      <img src={product.image_url} alt={product.name}
           className="h-full w-full object-cover rounded-xl" />

      {/* RODAPÉ */}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 rounded-b-xl p-3">
        <h3 className="text-white text-sm font-semibold leading-tight truncate">
          {product.name}{product.volume && ` • ${product.volume}`}
        </h3>
        <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block">
          R$ {Number(product.price_consumer).toFixed(2)}
        </span>
      </div>

      {/* DIALOG (somente info) */}
      <dialog id={`dlg-${product.id}`} className="rounded-xl p-6 backdrop:bg-black/40">
        <h4 className="font-semibold mb-2 text-lg">{product.name}</h4>

        {product.description && <p className="text-sm mb-3">{product.description}</p>}
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
