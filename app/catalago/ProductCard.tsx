export default function ProductCard({ product }: { product: any }) {
  return (
    <div className="border rounded-xl p-4 flex flex-col">
      <img
        src={product.image_url}
        alt={product.name}
        className="h-36 object-cover rounded-lg"
      />
      <h3 className="mt-2 font-semibold">{product.name}</h3>
      <p className="text-sm text-gray-600">{product.category}</p>
      <span className="mt-auto font-bold">
        R$ {Number(product.price_consumer).toFixed(2)}
      </span>
    </div>
  );
}
