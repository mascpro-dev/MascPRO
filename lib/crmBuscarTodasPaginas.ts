/** Percorre o CRM além do limite padrão de 1000 linhas do banco. */
export async function buscarTodasAsPaginas<T>(
  montar: (inicio: number, fim: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  tamanho = 1000
): Promise<{ data: T[]; error: string | null }> {
  const todos: T[] = [];
  for (let inicio = 0; inicio < 20000; inicio += tamanho) {
    const { data, error } = await montar(inicio, inicio + tamanho - 1);
    if (error) return { data: todos, error: error.message };
    const pagina = data || [];
    todos.push(...pagina);
    if (pagina.length < tamanho) break;
  }
  return { data: todos, error: null };
}
