export default function ProductCard({ product }: { product: any }) {
  return (
    <div className="border rounded-xl overflow-hidden shadow-sm">
      {/* imagem */}
      <img
        src={product.image_url}
        alt={product.name}
        className="h-36 w-full object-cover"
      />

      {/* conteúdo */}
      <div className="p-3">
        {/* nome */}
        <h3 className="font-semibold text-sm leading-snug">
          {product.name}
          {product.volume && ` • ${product.volume}`}
        </h3>

        {/* categoria */}
        <p className="text-xs text-gray-500 mb-1">{product.category}</p>

        {/* preço consumidor (price_consumer) */}
        <span className="inline-block bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
          R$ {Number(product.price_consumer).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
