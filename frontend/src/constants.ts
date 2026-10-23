// Static wizard options and the config for dynamic extra questions.

import type { Answers, ProfilePayload } from "./types";

export interface Option {
  key: string;
  en: string;
  hi: string;
}

export const STATES: Option[] = [
  { key: "Andhra Pradesh", en: "Andhra Pradesh", hi: "आंध्र प्रदेश" },
  { key: "Arunachal Pradesh", en: "Arunachal Pradesh", hi: "अरुणाचल प्रदेश" },
  { key: "Assam", en: "Assam", hi: "असम" },
  { key: "Bihar", en: "Bihar", hi: "बिहार" },
  { key: "Chhattisgarh", en: "Chhattisgarh", hi: "छत्तीसगढ़" },
  { key: "Goa", en: "Goa", hi: "गोवा" },
  { key: "Gujarat", en: "Gujarat", hi: "गुजरात" },
  { key: "Haryana", en: "Haryana", hi: "हरियाणा" },
  { key: "Himachal Pradesh", en: "Himachal Pradesh", hi: "हिमाचल प्रदेश" },
  { key: "Jharkhand", en: "Jharkhand", hi: "झारखंड" },
  { key: "Karnataka", en: "Karnataka", hi: "कर्नाटक" },
  { key: "Kerala", en: "Kerala", hi: "केरल" },
  { key: "Madhya Pradesh", en: "Madhya Pradesh", hi: "मध्य प्रदेश" },
  { key: "Maharashtra", en: "Maharashtra", hi: "महाराष्ट्र" },
  { key: "Manipur", en: "Manipur", hi: "मणिपुर" },
  { key: "Meghalaya", en: "Meghalaya", hi: "मेघालय" },
  { key: "Mizoram", en: "Mizoram", hi: "मिज़ोरम" },
  { key: "Nagaland", en: "Nagaland", hi: "नागालैंड" },
  { key: "Odisha", en: "Odisha", hi: "ओडिशा" },
  { key: "Punjab", en: "Punjab", hi: "पंजाब" },
  { key: "Rajasthan", en: "Rajasthan", hi: "राजस्थान" },
  { key: "Sikkim", en: "Sikkim", hi: "सिक्किम" },
  { key: "Tamil Nadu", en: "Tamil Nadu", hi: "तमिलनाडु" },
  { key: "Telangana", en: "Telangana", hi: "तेलंगाना" },
  { key: "Tripura", en: "Tripura", hi: "त्रिपुरा" },
  { key: "Uttar Pradesh", en: "Uttar Pradesh", hi: "उत्तर प्रदेश" },
  { key: "Uttarakhand", en: "Uttarakhand", hi: "उत्तराखंड" },
  { key: "West Bengal", en: "West Bengal", hi: "पश्चिम बंगाल" },
  { key: "Andaman and Nicobar Islands", en: "Andaman and Nicobar Islands", hi: "अंडमान और निकोबार द्वीप समूह" },
  { key: "Chandigarh", en: "Chandigarh", hi: "चंडीगढ़" },
  { key: "Dadra and Nagar Haveli and Daman and Diu", en: "Dadra and Nagar Haveli and Daman and Diu", hi: "दादरा और नगर हवेली और दमन और दीव" },
  { key: "Delhi", en: "Delhi", hi: "दिल्ली" },
  { key: "Jammu and Kashmir", en: "Jammu and Kashmir", hi: "जम्मू और कश्मीर" },
  { key: "Ladakh", en: "Ladakh", hi: "लद्दाख" },
  { key: "Lakshadweep", en: "Lakshadweep", hi: "लक्षद्वीप" },
  { key: "Puducherry", en: "Puducherry", hi: "पुडुचेरी" },
];

// Age is sent to the engine as the group's minimum age. Every group below
// sits entirely on one side of each age threshold used by the seeded rules
// (18, 40, 60), so the representative value never flips a PASS into a FAIL.
export const AGE_GROUPS: (Option & { age: number })[] = [
  { key: "under_18", en: "Under 18", hi: "18 से कम", age: 17 },
  { key: "18_25", en: "18–25", hi: "18–25", age: 18 },
  { key: "26_35", en: "26–35", hi: "26–35", age: 26 },
  { key: "36_40", en: "36–40", hi: "36–40", age: 36 },
  { key: "41_45", en: "41–45", hi: "41–45", age: 41 },
  { key: "46_59", en: "46–59", hi: "46–59", age: 46 },
  { key: "60_plus", en: "60 or above", hi: "60 या अधिक", age: 60 },
];

export const EDUCATION_LEVELS: Option[] = [
  { key: "below_matric", en: "Below matriculation (10th)", hi: "मैट्रिक (10वीं) से नीचे" },
  { key: "matric", en: "Matriculation (10th)", hi: "मैट्रिक (10वीं)" },
  { key: "post_matric", en: "Post-matriculation", hi: "उत्तर-मैट्रिक" },
  { key: "graduate", en: "Graduate or above", hi: "स्नातक या उच्चतर" },
];

export const OCCUPATIONS: Option[] = [
  { key: "farmer", en: "Farmer", hi: "किसान" },
  { key: "student", en: "Student", hi: "छात्र / छात्रा" },
  { key: "self_employed", en: "Self-employed", hi: "स्वरोजगार" },
  { key: "salaried", en: "Salaried employee", hi: "वेतनभोगी कर्मचारी" },
  { key: "daily_wage", en: "Daily wage worker", hi: "दैनिक मजदूरी श्रमिक" },
  { key: "homemaker", en: "Homemaker", hi: "गृहिणी" },
  { key: "unemployed", en: "Unemployed", hi: "बेरोजगार" },
  { key: "retired", en: "Retired", hi: "सेवानिवृत्त" },
];

// Keys must match the engine's INCOME_BANDS (backend/app/engine.py).
export const INCOME_BANDS: Option[] = [
  { key: "below_50000", en: "Below Rs. 50,000", hi: "50,000 रुपये से कम" },
  { key: "50000_100000", en: "Rs. 50,000 – 1,00,000", hi: "50,000 – 1,00,000 रुपये" },
  { key: "100000_250000", en: "Rs. 1,00,000 – 2,50,000", hi: "1,00,000 – 2,50,000 रुपये" },
  { key: "250000_600000", en: "Rs. 2,50,000 – 6,00,000", hi: "2,50,000 – 6,00,000 रुपये" },
  { key: "600000_1200000", en: "Rs. 6,00,000 – 12,00,000", hi: "6,00,000 – 12,00,000 रुपये" },
  { key: "above_1200000", en: "Above Rs. 12,00,000", hi: "12,00,000 रुपये से अधिक" },
];

export type ExtraKind = "yesno" | "select" | "number";

export interface ExtraFieldConfig {
  kind: ExtraKind;
  options?: string[];
}

// How to ask each dynamic extra question. Keys match engine criteria.
// Unknown criteria fall back to a yes/no question.
export const EXTRA_FIELD_CONFIG: Record<string, ExtraFieldConfig> = {
  is_farmer_family: { kind: "yesno" },
  has_cultivable_land: { kind: "yesno" },
  family_pays_income_tax: { kind: "yesno" },
  lives_in_rural: { kind: "yesno" },
  lives_in_urban: { kind: "yesno" },
  has_pmay_house: { kind: "yesno" },
  has_pucca_house: { kind: "yesno" },
  in_secc_2011_list: { kind: "yesno" },
  is_pregnant_or_lactating: { kind: "yesno" },
  in_formal_employment: { kind: "yesno" },
  has_bank_account: { kind: "yesno" },
  is_income_taxpayer: { kind: "yesno" },
  has_girl_child_under_10: { kind: "yesno" },
  has_business_plan: { kind: "yesno" },
  has_npa_history: { kind: "yesno" },
  is_bpl: { kind: "yesno" },
  house_type: { kind: "select", options: ["houseless", "kutcha", "pucca"] },
  caste_category: { kind: "select", options: ["SC", "ST", "OBC", "General"] },
  birth_order: { kind: "number" },
  loan_amount: { kind: "number" },
  ssy_accounts_count: { kind: "number" },
};

// Convert wizard answers into the POST /match payload shape.
export function toPayload(answers: Answers): ProfilePayload {
  return {
    state: answers.state,
    age: answers.age,
    education_level: answers.education_level,
    occupation: answers.occupation,
    income_range: answers.income_range,
    extra: answers.extra,
  };
}

export const EMPTY_ANSWERS: Answers = { extra: {} };
