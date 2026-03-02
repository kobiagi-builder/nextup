/**
 * User Profile / Context Page
 *
 * Set up user information for AI personalization.
 * Includes: About Me, Profession, Customers, Goals sections.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Check,
  Pencil,
  Sparkles,
  Star,
  Target,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { UserContextForm } from "../components/forms";
import { useUpdateUserContext, useUserContext } from "../hooks/useUserContext";
import { useIcpSettings } from "@/features/customers/hooks/useIcpSettings";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import type { UpdateUserContextInput, UserContext } from "../types/portfolio";

/** Profile section configuration */
const SECTIONS = [
  {
    id: "about" as const,
    icon: User,
    title: "About Me",
    fields: ["Bio", "Value Proposition"],
    emptyState: {
      heading: "Who are you? Let the world know",
      description:
        "Share your story, background, and what makes you unique. This helps our AI write content that sounds authentically you - not like a generic chatbot.",
      hints: [
        "Your professional background",
        "What makes you different",
        "Your value proposition",
      ],
    },
    getContent: (ctx: UserContext | null) => ({
      bio: ctx?.about_me?.bio,
      value_proposition: ctx?.about_me?.value_proposition,
    }),
    isEmpty: (ctx: UserContext | null) =>
      !ctx?.about_me?.bio && !ctx?.about_me?.value_proposition,
  },
  {
    id: "profession" as const,
    icon: Briefcase,
    title: "Profession",
    fields: ["Expertise", "Industries"],
    emptyState: {
      heading: "What do you do best?",
      description:
        "List your areas of expertise and the industries you work in. The AI uses this to weave in relevant domain knowledge and position you as the expert you are.",
      hints: [
        "Your core skills and specialties",
        "Industries you serve",
        "Methods or frameworks you use",
      ],
    },
    getContent: (ctx: UserContext | null) => ({
      expertise_areas: ctx?.profession?.expertise_areas,
      industries: ctx?.profession?.industries,
    }),
    isEmpty: (ctx: UserContext | null) =>
      !ctx?.profession?.expertise_areas && !ctx?.profession?.industries,
  },
  {
    id: "customers" as const,
    icon: Target,
    title: "Customers",
    fields: ["ICP Profile"],
    emptyState: {
      heading: "Who do you create content for?",
      description:
        "Define your ideal customer profile. When the AI knows who you\u2019re talking to, it crafts content that truly resonates with them.",
      hints: [
        "Your ideal client profile",
        "Their biggest challenges",
        "What they care about",
      ],
    },
    getContent: () => ({}),
    isEmpty: () => false, // Emptiness checked inline via icpSettings
  },
  {
    id: "goals" as const,
    icon: Star,
    title: "Goals",
    fields: ["Content Goals"],
    emptyState: {
      heading: "What are you aiming for?",
      description:
        "Define your content goals and priorities. This guides the AI to suggest topics and angles that actually move the needle for your business.",
      hints: [
        "Thought leadership or lead generation?",
        "Topics you want to own",
        "Outcomes you're driving toward",
      ],
    },
    getContent: (ctx: UserContext | null) => ({
      content_goals: ctx?.goals?.content_goals,
    }),
    isEmpty: (ctx: UserContext | null) => !ctx?.goals?.content_goals,
  },
];

type SectionType = "about_me" | "profession" | "customers" | "goals";

export function ProfilePage() {
  const [editingSection, setEditingSection] = useState<SectionType | null>(
    null,
  );
  const { toast } = useToast();

  // Data hooks
  const { data: userContext, isLoading } = useUserContext();
  const updateUserContext = useUpdateUserContext();
  const { isEnabled: hasCustomers } = useFeatureFlag('customer_management');
  const { data: icpSettings } = useIcpSettings();

  // Calculate completion percentage
  const completion = useMemo(() => {
    if (!userContext) return 0;
    const totalSections = SECTIONS.length;
    const completedSections = SECTIONS.filter((section) => {
      if (section.id === 'customers') return !!icpSettings;
      return !section.isEmpty(userContext);
    }).length;
    return Math.round((completedSections / totalSections) * 100);
  }, [userContext, icpSettings]);

  // Handle save
  const handleSave = async (data: UpdateUserContextInput) => {
    try {
      await updateUserContext.mutateAsync(data);
      setEditingSection(null);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error("[ProfilePage] Failed to update profile:", error);
      toast({
        title: "Failed to save",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Map section id to SectionType
  const sectionIdToType: Record<string, SectionType> = {
    about: "about_me",
    profession: "profession",
    customers: "customers",
    goals: "goals",
  };

  // Render field value
  const renderFieldValue = (value: unknown) => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-secondary rounded text-sm text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      );
    }
    if (typeof value === "string" && value.trim()) {
      return (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {value}
        </p>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-md font-semibold text-foreground">
            Your Profile
          </h1>
          <p className="mt-1 text-muted-foreground">
            Help us know you better to create your personalized content.
          </p>
        </div>
        <Button onClick={() => setEditingSection("about_me")}>
          Edit Profile
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="rounded-lg bg-card p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Profile Completion
          </span>
          <span className="text-sm text-muted-foreground">{completion}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-300 transition-all duration-300"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Profile Sections */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isEmpty = section.id === 'customers'
              ? !(hasCustomers && icpSettings)
              : section.isEmpty(userContext ?? null);
            const content = section.getContent(userContext ?? null);

            return (
              <div key={section.id}>
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  {/* Section Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          isEmpty ? "bg-secondary" : "bg-brand-300/20",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            isEmpty
                              ? "text-muted-foreground"
                              : "text-brand-300",
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {section.title}
                          </h3>
                          {!isEmpty && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {section.fields.join(" • ")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setEditingSection(sectionIdToType[section.id])
                      }
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  </div>

                  {/* Section Content */}
                  <div className="p-4 space-y-3">
                    {isEmpty ? (
                      <div className="py-5 px-6">
                        <div className="flex items-start gap-3 mb-3">
                          <Sparkles className="h-4 w-4 text-brand-300 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {section.emptyState.heading}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {section.emptyState.description}
                            </p>
                          </div>
                        </div>
                        <div className="ml-7 flex flex-wrap gap-2 mt-3">
                          {section.emptyState.hints.map((hint) => (
                            <span
                              key={hint}
                              className="px-2.5 py-1 text-xs rounded-full bg-secondary text-muted-foreground"
                            >
                              {hint}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() =>
                            setEditingSection(sectionIdToType[section.id])
                          }
                          className="ml-7 mt-4 text-sm text-brand-300 hover:text-brand-200 transition-colors font-medium"
                        >
                          Get started &rarr;
                        </button>
                      </div>
                    ) : (
                      Object.entries(content).map(([key, value]) => {
                        const renderedValue = renderFieldValue(value);
                        if (!renderedValue) return null;
                        const label = key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                        return (
                          <div key={key}>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                              {label}
                            </h4>
                            {renderedValue}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ICP Profile — inside Customers card */}
                  {section.id === 'customers' && hasCustomers && icpSettings && (
                    <div className="border-t border-border p-4 space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        ICP Profile
                      </h4>
                      {(icpSettings.target_employee_min != null || icpSettings.target_employee_max != null) && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Target Employees
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {icpSettings.target_employee_min ?? '0'} – {icpSettings.target_employee_max ?? '∞'}
                          </p>
                        </div>
                      )}
                      {icpSettings.target_industries.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Target Industries
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {icpSettings.target_industries.map((ind) => (
                              <span key={ind} className="px-2 py-0.5 bg-secondary rounded text-sm text-muted-foreground">
                                {ind}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {icpSettings.target_specialties.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Target Specialties
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {icpSettings.target_specialties.map((spec) => (
                              <span key={spec} className="px-2 py-0.5 bg-secondary rounded text-sm text-muted-foreground">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {icpSettings.description && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            ICP Description
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {icpSettings.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingSection}
        onOpenChange={(open) => !open && setEditingSection(null)}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-portal-ignore-click-outside
        >
          <DialogHeader>
            <DialogTitle>
              Edit{" "}
              {SECTIONS.find((s) => sectionIdToType[s.id] === editingSection)
                ?.title ?? "Profile"}
            </DialogTitle>
          </DialogHeader>
          {editingSection && (
            <UserContextForm
              section={editingSection}
              context={userContext}
              onSubmit={handleSave}
              onCancel={() => setEditingSection(null)}
              isLoading={updateUserContext.isPending}
              showIcp={hasCustomers}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProfilePage;
