export default function XPModal({ show, onClose }: any) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[500]">
      <div className="bg-white p-8 rounded-2xl text-center">
        <h2 className="text-2xl font-bold mb-4">PARABÉNS!</h2>
        <button onClick={onClose} className="bg-slate-900 text-white px-6 py-2 rounded-lg">Fechar</button>
      </div>
    </div>
  )
}