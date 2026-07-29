import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useFavorites } from "@/lib/service-favorites";
import { cn } from "@/lib/utils";

type Props = {
  catKey: string;
  itemKey: string;
  title?: string;
  size?: "sm" | "md";
  className?: string;
};

export function FavoriteButton({ catKey, itemKey, title, size = "sm", className }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(catKey, itemKey);
  const dim = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(catKey, itemKey);
        toast.success(added ? `تمت إضافة ${title ?? "الخدمة"} للمفضلة` : "تمت الإزالة من المفضلة");
      }}
      aria-label={active ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      aria-pressed={active}
      className={cn(
        "grid place-items-center rounded-full border transition backdrop-blur",
        dim,
        active
          ? "border-rose-500/50 bg-rose-500/15 text-rose-500 shadow-[0_0_18px_-4px_rgba(244,63,94,0.6)]"
          : "border-border bg-background/60 text-muted-foreground hover:text-rose-400 hover:border-rose-400/50",
        className,
      )}
    >
      <Heart className={cn(icon, active && "fill-current")} />
    </motion.button>
  );
}
