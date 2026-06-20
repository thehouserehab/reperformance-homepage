export type WorkspaceValue = {
  label: string;
  value: string;
  hint?: string;
};

export type WorkspaceGroup = {
  title: string;
  values: readonly WorkspaceValue[];
};

export type ProfileHighlight = {
  label: string;
  value: string;
};

export type NutritionGoal = {
  label: string;
  value: string;
  unit?: string;
};

export type WorkspaceConfig = {
  audienceLabel: string;
  memberName: string;
  memberId: string;
  status: string;
  summary: string;
  highlights: readonly ProfileHighlight[];
  infoGroups: readonly WorkspaceGroup[];
  nutritionGoals: readonly NutritionGoal[];
  nutritionNote: string;
  focusCards: readonly {
    title: string;
    text: string;
  }[];
  tabs: readonly string[];
  emptyRecordDescription: string;
};
