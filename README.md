# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/400da6f8-7fa7-4353-9ce2-9842c4532f4f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/400da6f8-7fa7-4353-9ce2-9842c4532f4f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Conectar Supabase (base de datos)

1. Crea un proyecto en Supabase y copia el `Project URL` y la `anon/public API key` desde **Settings > API**.
2. Duplica `.env.example` a `.env` y pega ahí `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY` si prefieres ese nombre).
3. Si usas la CLI de Supabase (instálala con `npm i -g supabase` y haz `supabase login`), actualiza `supabase/config.toml` con tu `project_id` y aplica una a una, con `supabase db query --linked -f supabase/migrations/<fichero>.sql` (demo primero; nunca `db push`, ver docs/PROCESO-DE-CAMBIOS.md), para crear las tablas (`platos`, `vinos`, `bebidas`) incluidas en `supabase/migrations`.
4. Arranca la app con `npm run dev`; la carta leerá directamente desde tu base de datos Supabase.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/400da6f8-7fa7-4353-9ce2-9842c4532f4f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
