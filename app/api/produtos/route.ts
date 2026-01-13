import { NextResponse } from 'next/server';

export async function GET() {
  const STORE_ID = 'SEU_STORE_ID'; // Substitua pelo seu
  const ACCESS_TOKEN = 'SEU_ACCESS_TOKEN'; // Substitua pelo seu

  try {
    const response = await fetch(`https://api.tiendanube.com/v1/${STORE_ID}/products`, {
      headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'User-Agent': 'MascPRO App (seuemail@exemplo.com)'
      }
    });

    const data = await response.json();

    // Formatamos os dados para o padrão do nosso App
    const products = data.map((p: any) => ({
      id: p.id,
      title: p.name.pt || p.name,
      price: parseFloat(p.variants[0].price),
      image_url: p.images[0]?.src,
      description: p.description?.pt || p.description,
      stock: p.variants[0].stock,
      slug: p.handle?.pt || p.handle
    }));

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}