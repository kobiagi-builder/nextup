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
import { Briefcase, Check, Pencil, Star, Target, User } from "lucide-react";
import { useMemo, useState } from "react";
import { UserContextForm } from "../components/forms";
import { useUpdateUserContext, useUserContext } from "../hooks/useUserContext";
import type { UpdateUserContextInput, UserContext } from "../types/portfolio";

/** Profile section configuration */
const SECTIONS = [
  {
    id: "about" as const,
    icon: User,
    title: "About Me",
    fields: ["Bio", "Value Proposition"],
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
    fields: ["Target Audience"],
    getContent: (ctx: UserContext | null) => ({
      target_audience: ctx?.customers?.target_audience,
    }),
    isEmpty: (ctx: UserContext | null) => !ctx?.customers?.target_audience,
  },
  {
    id: "goals" as const,
    icon: Star,
    title: "Goals",
    fields: ["Content Goals"],
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

  // Calculate completion percentage
  const completion = useMemo(() => {
    if (!userContext) return 0;
    const totalSections = SECTIONS.length;
    const completedSections = SECTIONS.filter(
      (section) => !section.isEmpty(userContext),
    ).length;
    return Math.round((completedSections / totalSections) * 100);
  }, [userContext]);

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
            const isEmpty = section.isEmpty(userContext ?? null);
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
                      <p className="text-sm text-center text-muted-foreground py-4">
                        No information added yet. Click Edit to get started.
                      </p>
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
                </div>

                {/* Skills section hidden - not yet consumed by content agent */}
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
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProfilePage;
