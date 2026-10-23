import React from "react";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { CheckCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type FREQUENCY,
  FrequencyToggle,
} from "@/components/ui/pricing-4-utils/frequency-toggle";

export type Plan = {
  name: string;
  info: string;
  price: {
    monthly: number;
    yearly: number; // yearly per month
  };
  features: string[];
  btn: {
    text: string;
    href: string;
  };
  highlighted?: boolean;
};

export const defaultPlans: Plan[] = [
  {
    name: "Starter",
    info: "For individual freelancers starting out",
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      "Up to 2 active clients",
      "Up to 3 invoices per month",
      "Direct UPI payment links",
      "Work log deliverables tracker",
      "Standard PDF invoice export",
    ],
    btn: {
      text: "Current Free Tier",
      href: "#",
    },
  },
  {
    highlighted: true,
    name: "Pro Freelancer",
    info: "For active creators & growing businesses",
    price: {
      monthly: 79,
      yearly: 75, // ₹899/year (~₹75/mo)
    },
    features: [
      "Unlimited clients & sub-clients",
      "Unlimited invoices with personal UPI QR",
      "Automated 6:00 AM delivery scheduling",
      "Client review portal & public portfolio",
      "0% payment gateway commission",
      "7-Day Free Trial (₹1 verification)",
      "Priority customer support",
    ],
    btn: {
      text: "Start 7-Day Free Trial",
      href: "#",
    },
  },
  {
    name: "Studio Agency",
    info: "For boutique studios and teams",
    price: {
      monthly: 199,
      yearly: 169,
    },
    features: [
      "All Pro Freelancer features included",
      "Multi-brand client onboarding workflows",
      "Custom domain white-labeling",
      "Bulk GST & financial year ledger export",
      "24/7 dedicated concierge assistance",
    ],
    btn: {
      text: "Upgrade to Studio",
      href: "#",
    },
  },
];

interface PricingSectionProps {
  plans?: Plan[];
  onSelectPlan?: (plan: Plan, frequency: FREQUENCY) => void;
  className?: string;
}

export default function PricingSection({
  plans = defaultPlans,
  onSelectPlan,
  className,
}: PricingSectionProps) {
  const [frequency, setFrequency] = React.useState<FREQUENCY>("monthly");

  return (
    <div className={cn("flex w-full flex-col items-center justify-center space-y-7 p-4", className)}>
      <div className="mx-auto max-w-xl space-y-2 text-center">
        <h2 className="font-bold text-2xl tracking-tight text-slate-900 md:text-3xl lg:text-4xl">
          Plans that Scale with You
        </h2>
        <p className="text-slate-500 text-sm md:text-base">
          Whether you're just starting your freelance journey or managing recurring retainers,
          CrestFlow gives you transparent, zero-commission pricing.
        </p>
      </div>

      <FrequencyToggle frequency={frequency} setFrequency={setFrequency} />

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
        {plans.map((plan) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            frequency={frequency}
            onSelectPlan={onSelectPlan}
          />
        ))}
      </div>
    </div>
  );
}

export { PricingSection };

type PricingCardProps = React.ComponentProps<"div"> & {
  plan: Plan;
  frequency?: FREQUENCY;
  onSelectPlan?: (plan: Plan, frequency: FREQUENCY) => void;
};

export function PricingCard({
  plan,
  className,
  frequency = "monthly",
  onSelectPlan,
  ...props
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all shadow-xs",
        plan.highlighted && "ring-2 ring-slate-900 shadow-md md:-translate-y-1",
        className
      )}
      key={plan.name}
      {...props}
    >
      <div
        className={cn(
          "border-b border-slate-100 p-5",
          plan.highlighted && "bg-slate-50/70"
        )}
      >
        <AnimatePresence mode="wait">
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
            {plan.highlighted && (
              <motion.div
                className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 shadow-2xs"
                key="popular-badge"
                layout
                transition={{ duration: 0.1 }}
              >
                <Star className="size-3 fill-amber-400 text-amber-500" />
                Popular
              </motion.div>
            )}

            {frequency === "yearly" &&
              plan.price.monthly > plan.price.yearly && (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1 rounded-md border border-slate-900 bg-slate-900 text-white px-2 py-0.5 text-xs font-medium"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  key="discount-badge"
                  layout
                  transition={{ duration: 0.15 }}
                >
                  {Math.round(
                    ((plan.price.monthly - plan.price.yearly) /
                      plan.price.monthly) *
                      100,
                  )}
                  % off
                </motion.div>
              )}
          </div>
        </AnimatePresence>

        <div className="font-semibold text-lg text-slate-900">{plan.name}</div>
        <p className="font-normal text-slate-500 text-xs mt-0.5">{plan.info}</p>
        
        <div className="mt-5 mb-1 flex w-max items-baseline gap-1">
          <NumberFlow
            className="font-extrabold text-3xl text-slate-900 tracking-tight"
            format={{
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }}
            value={plan.price[frequency]}
          />
          <span className="text-xs text-slate-500 font-normal">/month</span>
        </div>
        <p className="mb-1 font-normal text-slate-400 text-xs">
          {plan.price[frequency] === 0 ? "free forever" : `billed ${frequency}`}
        </p>
      </div>

      <div
        className={cn(
          "flex-1 space-y-3 px-5 pt-5 pb-6 text-slate-600 text-xs md:text-sm",
          plan.highlighted && "bg-slate-50/30"
        )}
      >
        {plan.features.map((feature) => (
          <div className="flex items-start gap-2.5" key={feature}>
            <CheckCircle className="size-4 text-slate-900 shrink-0 mt-0.5" />
            <span className="leading-snug">{feature}</span>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "mt-auto w-full border-t border-slate-100 p-4",
          plan.highlighted && "bg-slate-50/70"
        )}
      >
        <Button
          asChild
          className={cn(
            "w-full cursor-pointer font-medium rounded-xl transition-all",
            plan.highlighted
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50"
          )}
          variant={plan.highlighted ? "default" : "outline"}
          onClick={() => onSelectPlan?.(plan, frequency)}
        >
          <Link href={plan.btn.href}>{plan.btn.text}</Link>
        </Button>
      </div>
    </div>
  );
}
