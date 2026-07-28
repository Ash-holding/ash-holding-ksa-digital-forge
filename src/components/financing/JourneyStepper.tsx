import { motion, useReducedMotion } from "framer-motion";
import { Check, Circle } from "lucide-react";

export type JourneyStep = { title: string; desc?: string; done?: boolean; active?: boolean };

export function JourneyStepper({ steps }: { steps: JourneyStep[] }) {
  const reduce = useReducedMotion();
  return (
    <ol className="relative border-r border-slate-200 pr-6 space-y-6">
      {steps.map((s, i) => {
        const state = s.done ? "done" : s.active ? "active" : "todo";
        return (
          <motion.li
            key={i}
            initial={reduce ? {} : { opacity: 0, x: 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: reduce ? 0 : i * 0.04 }}
            className="relative"
          >
            <span
              className={`absolute -right-9 top-0 grid h-7 w-7 place-items-center rounded-full border-2 ${
                state === "done"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : state === "active"
                  ? "border-blue-600 bg-white text-blue-600"
                  : "border-slate-300 bg-white text-slate-400"
              }`}
              aria-hidden
            >
              {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}
            </span>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="text-sm font-bold text-slate-900">{s.title}</div>
              {s.desc && <div className="mt-1 text-xs leading-6 text-slate-500">{s.desc}</div>}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
