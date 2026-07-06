import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function FormSheet({
  trigger,
  title,
  description,
  children,
  onSubmit,
  submitText = "حفظ",
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  submitText?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolled;
  const setOpen = (v: boolean) => { if (isControlled) onOpenChange?.(v); else setUncontrolled(v); };
  const close = () => setOpen(false);

  const [loading, setLoading] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            if (!onSubmit) return;
            e.preventDefault();
            setLoading(true);
            try { await onSubmit(e); } finally { setLoading(false); }
          }}
        >
          {typeof children === "function" ? children(close) : children}
          {onSubmit && (
            <SheetFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={close}>إلغاء</Button>
              <Button type="submit" disabled={loading}>{loading ? "..." : submitText}</Button>
            </SheetFooter>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
