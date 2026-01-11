# Guia de Configuração e Teste

## ✅ O que foi implementado

### Páginas Criadas:
1. **Academy** (`/academy`) - Lista cursos com filtro por categoria
2. **Loja** (`/loja`) - Produtos/cursos com preço e filtro por categoria
3. **Detalhes do Curso** (`/academy/courses/[id]`) - Visualiza módulos e aulas

### Componentes:
- `CourseCard` - Card reutilizável para exibir cursos
- `CategoryFilter` - Filtro de categorias com botões
- `XPBar` - Barra de progresso (conectada à tabela `user_lessons_progress`)

### Tipos TypeScript:
- `Category`, `Course`, `Module`, `Lesson`, `UserLessonProgress`

---

## 🔧 Configuração do Supabase

### Tabelas necessárias (já criadas no seu Supabase):

**1. Category**
```sql
- id (uuid)
- name (text)
- slug (text)
- created_at (timestamp)
```

**2. Course**
```sql
- id (uuid)
- title (text)
- description (text, opcional)
- categoryId ou category_id (uuid, FK → Category)
- published ou isPublished (boolean)
- price (float)
- created_at (timestamp)
```

**3. Module**
```sql
- id (uuid)
- title (text)
- description (text, opcional)
- course_id (uuid, FK → Course)
- isPublished (boolean)
- order (int, opcional)
- created_at (timestamp)
```

**4. Lesson**
```sql
- id (uuid)
- title (text)
- description (text, opcional)
- module_id (uuid, FK → Module)
- isPublished (boolean)
- content (text, opcional)
- video_url (text, opcional)
- duration (int, opcional)
- order (int, opcional)
- xp_reward (int, opcional)
- created_at (timestamp)
```

---

## 🔐 Políticas RLS (Row Level Security)

Certifique-se de que as políticas RLS permitem SELECT para usuários autenticados:

```sql
-- Habilitar RLS
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Module" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lesson" ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT (leitura pública para conteúdo publicado)
CREATE POLICY "Permitir leitura de categorias" ON "Category" FOR SELECT USING (true);

CREATE POLICY "Permitir leitura de cursos publicados" ON "Course" 
  FOR SELECT USING (published = true OR "isPublished" = true);

CREATE POLICY "Permitir leitura de módulos publicados" ON "Module" 
  FOR SELECT USING ("isPublished" = true);

CREATE POLICY "Permitir leitura de aulas publicadas" ON "Lesson" 
  FOR SELECT USING ("isPublished" = true);
```

---

## 📝 Como Testar

### 1. Instalar dependências
```powershell
npm install
```

### 2. Criar arquivo `.env.local` na raiz do projeto
```
NEXT_PUBLIC_SUPABASE_URL=https://pdvrxzcfgvfkeuoyyzwq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdnJ4emNmZ3Zma2V1b3l5endxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODQzNTEsImV4cCI6MjA4MzY2MDM1MX0.XfbCQ5R676JV-_VnaUYJZhX3ho75YEbYh45RuzuLJ7o
```

### 3. Iniciar o servidor
```powershell
npm run dev
```

### 4. Acessar
```
http://localhost:3000
```

---

## 🧪 Teste das Funcionalidades

### Teste 1: Login
1. Acesse `/login`
2. Entre com um usuário válido do Supabase Auth
3. Deve redirecionar para o dashboard

### Teste 2: Academy
1. Acesse `/academy`
2. Deve mostrar categorias e cursos publicados
3. Clique em uma categoria para filtrar
4. Clique em "Ver Curso" para ver detalhes

### Teste 3: Loja
1. Acesse `/loja`
2. Deve mostrar apenas cursos com `price > 0`
3. Filtre por categoria
4. Veja os preços sendo exibidos

### Teste 4: Detalhes do Curso
1. Clique em qualquer curso
2. Deve mostrar módulos e aulas
3. Ver XP de cada aula (se configurado)

---

## 🐛 Resolução de Problemas

### Erro: "relation 'Category' does not exist"
**Solução:** As tabelas podem estar em minúsculo. Tente alterar as queries:
- De `Category` para `categories`
- De `Course` para `courses`
- De `Module` para `modules`
- De `Lesson` para `lessons`

**Arquivo para editar:** 
- `app/(dashboard)/academy/page.tsx` (linhas 38-39)
- `app/(dashboard)/loja/page.tsx` (linhas 38-39)
- `app/(dashboard)/academy/courses/[id]/page.tsx` (linhas 27, 39, 53)

### Categorias não aparecem
**Verifique:**
1. Se há dados na tabela `Category`
2. Se o RLS está configurado corretamente
3. Abra o console do navegador (F12) e veja erros

### Cursos não aparecem
**Verifique:**
1. Se `published` ou `isPublished` está `true`
2. Se o `categoryId` está vinculado corretamente
3. Console do navegador para erros

---

## 🚀 Próximos Passos

- Implementar página de visualização de aula
- Sistema de progresso do usuário
- Checkout de compra na Loja
- Sistema de agendamentos
- Gamificação com badges e níveis

---

## 📞 Suporte

Se houver algum erro, verifique:
1. Console do navegador (F12 → Console)
2. Logs do servidor Next.js (terminal onde rodou `npm run dev`)
3. Supabase Dashboard → Logs
