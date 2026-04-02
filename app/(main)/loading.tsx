export default function MainLoading() {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center gap-4"
      aria-busy="true"
      aria-label="Carregando página"
    >
      <div
        className="h-10 w-10 rounded-full border-2 border-[#C9A66B] border-t-transparent animate-spin"
        role="presentation"
      />
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
        Carregando…
      </p>
    </div>
  );
}
