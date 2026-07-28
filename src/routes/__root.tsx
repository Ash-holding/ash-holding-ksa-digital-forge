import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const message = (error && (error.message || String(error))) || "خطأ غير معروف";
  const stack = (error && (error.stack || "")) as string;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10" dir="rtl">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-xl font-semibold">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm text-muted-foreground">حاول تحديث الصفحة أو العودة للرئيسية.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            الرئيسية
          </a>
        </div>
        <details className="mt-6 text-start rounded-lg border border-border/60 bg-muted/30 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">تفاصيل الخطأ (للدعم الفني)</summary>
          <div className="mt-2 text-xs font-mono text-destructive break-words whitespace-pre-wrap" dir="ltr">
            {message}
          </div>
          {stack && (
            <pre className="mt-2 text-[10px] font-mono text-muted-foreground overflow-auto max-h-64" dir="ltr">
              {stack}
            </pre>
          )}
        </details>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ASH HOLDING — حلول رقمية متكاملة لبناء وتشغيل أعمالك" },
      { name: "description", content: "شركة علي صالح الشهري القابضة — تطوير مواقع وتطبيقات، أنظمة، ذكاء اصطناعي، استضافة وتسويق رقمي بجودة مؤسسية سعودية." },
      { name: "author", content: "ASH HOLDING" },
      { property: "og:title", content: "ASH HOLDING — حلول رقمية متكاملة لبناء وتشغيل أعمالك" },
      { property: "og:description", content: "شركة علي صالح الشهري القابضة — تطوير مواقع وتطبيقات، أنظمة، ذكاء اصطناعي، استضافة وتسويق رقمي بجودة مؤسسية سعودية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ASH HOLDING — حلول رقمية متكاملة لبناء وتشغيل أعمالك" },
      { name: "twitter:description", content: "شركة علي صالح الشهري القابضة — تطوير مواقع وتطبيقات، أنظمة، ذكاء اصطناعي، استضافة وتسويق رقمي بجودة مؤسسية سعودية." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ae356f04-1770-4902-8277-6821276811d7/id-preview-db5b6dbe--4967624a-4d1f-4e55-bf4d-91bb4a18d26f.lovable.app-1783311684515.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ae356f04-1770-4902-8277-6821276811d7/id-preview-db5b6dbe--4967624a-4d1f-4e55-bf4d-91bb4a18d26f.lovable.app-1783311684515.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=DM+Serif+Display&family=Fira+Sans:wght@400;500;600;700;800&display=swap" },


    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors closeButton dir="rtl" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
