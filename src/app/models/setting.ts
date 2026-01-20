export enum SettingCategory {
  LOAN_POLICY = 'LOAN_POLICY',
  EMAIL_NOTIFICATION = 'EMAIL_NOTIFICATION',
  SYSTEM = 'SYSTEM',
}

export enum SettingDataType {
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  TIME = 'TIME',
}

export interface SettingDto {
  key: string;
  value: string;
  defaultValue: string | null;
  description: string | null;
  category: SettingCategory;
  dataType: SettingDataType;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface CategoryGroup {
  displayName: string;
  icon: string;
  settings: SettingDto[];
}

export interface GroupedSettingsResponse {
  groups: {
    [key: string]: CategoryGroup;
  };
}
