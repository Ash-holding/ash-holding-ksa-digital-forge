# SETUP.md — إعادة بناء بيئة مطابقة لمشروع ASH HOLDING

مرجع كامل لإعادة إنشاء نفس بيئة العمل من الصفر (Frontend فقط — لا يحتوي على أسرار ولا Backend).

---

## 1) المتطلبات

- Node.js ≥ 20
- Bun ≥ 1.1 (أو npm/pnpm — الأوامر أدناه ببن)
- Git

---

## 2) إنشاء المشروع

```bash
mkdir my-app && cd my-app
bun init -y
```

استبدل محتوى `package.json` بالكامل:

```json
{
  "name": "my-app",
  "private": true,
  "sideEffects": false,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

---

## 3) تثبيت جميع التبعيات (أمر واحد)

```bash
bun add \
  react@^19.2.0 react-dom@^19.2.0 \
  @tanstack/react-router@^1.170 @tanstack/react-start@^1.168 \
  @tanstack/router-plugin@^1.168 @tanstack/react-query@^5.101 \
  @tailwindcss/vite@^4.2 tailwindcss@^4.2 tw-animate-css@^1.3 \
  class-variance-authority@^0.7 clsx@^2.1 tailwind-merge@^3.5 \
  lucide-react@^0.575 framer-motion@^12 sonner@^2 vaul@^1.1 \
  cmdk@^1.1 date-fns@^4 react-day-picker@^9 react-hook-form@^7.71 \
  @hookform/resolvers@^5 zod@^3.24 recharts@^2.15 \
  embla-carousel-react@^8.6 input-otp@^1.4 react-resizable-panels@^4.6 \
  axios@^1.18 jwt-decode@^4 vite-tsconfig-paths@^6 \
  @radix-ui/react-accordion @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio @radix-ui/react-avatar \
  @radix-ui/react-checkbox @radix-ui/react-collapsible \
  @radix-ui/react-context-menu @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu @radix-ui/react-hover-card \
  @radix-ui/react-label @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu @radix-ui/react-popover \
  @radix-ui/react-progress @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area @radix-ui/react-select \
  @radix-ui/react-separator @radix-ui/react-slider \
  @radix-ui/react-slot @radix-ui/react-switch \
  @radix-ui/react-tabs @radix-ui/react-toggle \
  @radix-ui/react-toggle-group @radix-ui/react-tooltip
```

```bash
bun add -d \
  vite@^8 @vitejs/plugin-react@^5 typescript@^5.8 \
  @types/react@^19 @types/react-dom@^19 @types/node@^22 \
  eslint@^9 @eslint/js@^9 typescript-eslint@^8.56 \
  eslint-plugin-react-hooks@^5 eslint-plugin-react-refresh@^0.4 \
  eslint-plugin-prettier@^5 eslint-config-prettier@^10 \
  prettier@^3.7 globals@^15
```

> ملاحظة: `@lovable.dev/vite-tanstack-config` هو حزمة داخلية لـ Lovable — خارج Lovable استخدم Vite plugins مباشرة (انظر `vite.config.ts` في القسم 5).

---

## 4) بنية المجلدات

```
my-app/
├─ src/
│  ├─ routes/
│  │  ├─ __root.tsx
│  │  └─ index.tsx
│  ├─ components/
│  │  └─ ui/            # مكونات shadcn
│  ├─ lib/
│  │  └─ utils.ts
│  ├─ hooks/
│  ├─ styles.css
│  ├─ router.tsx
│  ├─ start.ts
│  └─ server.ts
├─ vite.config.ts
├─ tsconfig.json
├─ eslint.config.js
├─ components.json
└─ package.json
```

---

## 5) ملفات الإعداد (انسخها كما هي)

### `vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({ target: "cloudflare-module" }),
    react(),
  ],
  server: { port: 8080, host: "::", strictPort: true },
});
```

### `tsconfig.json`
```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts", "eslint.config.js"],
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### `eslint.config.js`
```js
import js from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  prettier,
);
```

### `components.json` (shadcn)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/styles.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### `.prettierrc`
```json
{ "semi": true, "singleQuote": false, "printWidth": 100, "tabWidth": 2, "trailingComma": "all" }
```

---

## 6) نظام التصميم — `src/styles.css`

```css
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: "IBM Plex Sans Arabic", "Inter", system-ui, sans-serif;

  /* Semantic tokens — تُترجم إلى bg-background / text-foreground ... */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Brand */
  --color-electric: var(--electric);
  --color-cyan-accent: var(--cyan-accent);
  --color-purple-accent: var(--purple-accent);
  --color-orange-accent: var(--orange-accent);
}

:root {
  --radius: 0.875rem;

  /* Brand palette (OKLCH) */
  --electric: oklch(0.62 0.22 258);
  --cyan-accent: oklch(0.78 0.14 210);
  --purple-accent: oklch(0.66 0.19 300);
  --orange-accent: oklch(0.75 0.16 55);

  --background: oklch(0.985 0.005 240);
  --foreground: oklch(0.18 0.05 265);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.18 0.05 265);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.18 0.05 265);
  --primary: oklch(0.26 0.08 265);
  --primary-foreground: oklch(0.985 0.005 240);
  --secondary: oklch(0.96 0.01 250);
  --secondary-foreground: oklch(0.26 0.08 265);
  --muted: oklch(0.96 0.01 250);
  --muted-foreground: oklch(0.5 0.03 258);
  --accent: oklch(0.62 0.22 258);
  --accent-foreground: oklch(0.985 0.005 240);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.01 250);
  --input: oklch(0.92 0.01 250);
  --ring: oklch(0.62 0.22 258);

  --gradient-brand: linear-gradient(135deg, oklch(0.26 0.08 265), oklch(0.62 0.22 258));
  --shadow-glow: 0 20px 60px -20px oklch(0.62 0.22 258 / 0.35);
  --shadow-card: 0 2px 8px -2px oklch(0.26 0.08 265 / 0.08),
                 0 12px 40px -20px oklch(0.26 0.08 265 / 0.12);
}

@layer base {
  * { border-color: var(--color-border); }
  html { direction: rtl; }
  body {
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4, h5 { font-weight: 700; letter-spacing: -0.01em; }
}

@utility glass {
  background: color-mix(in oklab, white 65%, transparent);
  backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid color-mix(in oklab, white 60%, transparent);
}

@utility gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@utility shadow-glow { box-shadow: var(--shadow-glow); }
@utility shadow-card { box-shadow: var(--shadow-card); }
```

**قاعدة ذهبية:** لا تستخدم أبدًا `bg-white`, `text-black`, `bg-[#hex]` في المكونات. استخدم فقط: `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `text-muted-foreground`, `border-border`... إلخ.

---

## 7) تثبيت shadcn/ui (كل المكونات دفعة واحدة)

```bash
bunx shadcn@latest init -y
bunx shadcn@latest add -y \
  accordion alert alert-dialog aspect-ratio avatar badge breadcrumb button \
  calendar card carousel chart checkbox collapsible command context-menu \
  dialog drawer dropdown-menu form hover-card input input-otp label \
  menubar navigation-menu pagination popover progress radio-group \
  resizable scroll-area select separator sheet sidebar skeleton slider \
  sonner switch table tabs textarea toggle toggle-group tooltip
```

---

## 8) الملفات الأساسية للـ Router

### `src/router.tsx`
```ts
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60_000, refetchOnWindowFocus: false },
    },
  });
  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });
};
```

### `src/routes/__root.tsx`
```tsx
import { createRootRouteWithContext, Outlet, HeadContent, Scripts } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import styles from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "My App" },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
});

function RootShell() {
  return (
    <html lang="ar" dir="rtl">
      <head><HeadContent /></head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
```

---

## 9) System Prompt للـ AI (ChatGPT / Claude)

استخدم هذا كـ **Custom Instructions**:

> أنت مطوّر واجهات محترف. استخدم دائمًا:
> - **Stack**: TanStack Start + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui (new-york) + Framer Motion + lucide-react.
> - **Semantic tokens فقط**: `bg-background`, `text-foreground`, `bg-primary`, `bg-card`, `border-border`, `text-muted-foreground`. ممنوع منعًا باتًا: `bg-white`, `text-black`, ألوان hex مباشرة، `text-gray-500`.
> - **RTL**: كل الواجهات عربية `dir="rtl"`، خط `IBM Plex Sans Arabic`.
> - **Radius**: استخدم `rounded-2xl` / `rounded-3xl` للبطاقات الكبيرة، `rounded-xl` للأزرار.
> - **Shadows**: `shadow-card` للبطاقات، `shadow-glow` للعناصر البارزة. لا تستخدم `shadow-md/lg` الافتراضية.
> - **Spacing**: نظام 4pt — `gap-3`, `gap-4`, `gap-6`, `p-4`, `p-6`, `p-8`.
> - **Typography scale**: `text-xs / text-sm / text-base / text-lg / text-xl / text-2xl / text-3xl / text-4xl`. عناوين H1 بـ `text-3xl md:text-5xl font-bold tracking-tight`.
> - **Motion**: Framer Motion فقط للانتقالات المهمة (fade+slide 200-400ms، ease-out). لا مبالغة.
> - **Responsive**: Mobile-first، اختبر على `sm md lg xl 2xl`. جدول ⇢ بطاقات مكدّسة على الجوال.
> - **Accessibility**: كل زر أيقونة له `aria-label`، focus states واضحة، keyboard navigation.
> - **States**: كل قائمة/جدول له 4 حالات: Loading (Skeleton) / Empty / Error / Success.
> - **مكونات صغيرة قابلة لإعادة الاستخدام** — لا ملفات فوق 300 سطر.
> - **File routing** بـ TanStack: `src/routes/about.tsx` = `/about`، `posts.$id.tsx` = `/posts/$id`. كل صفحة لها `head()` مستقل مع title/description/og.

---

## 10) أوامر التشغيل

```bash
bun install
bun run dev        # → http://localhost:8080
bun run build
bun run lint
bun run format
```

---

**هذا كل شيء.** الملف كامل ومستقل، انسخه إلى جذر أي مشروع جديد كمرجع، وأعطه لـ ChatGPT قبل أي طلب تصميم.
