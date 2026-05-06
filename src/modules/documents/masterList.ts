export interface MasterDocument {
  code: string;
  title: string;
  thai_form_name: string | null;
  category: string;
  document_type: string;
  authority: string;
  frequency: string;
}

export const MASTER_DOCUMENTS: MasterDocument[] = [
  { code: "DBD_CERT",          title: "DBD - Company Registration Certificate", thai_form_name: "หนังสือรับรองบริษัท",       category: "Corporate",          document_type: "legal",       authority: "Department of Business Development (DBD)", frequency: "Once" },
  { code: "PP20",              title: "VAT Registration",                        thai_form_name: "แบบ ภ.พ.20",                category: "Tax & Finance",      document_type: "other",       authority: "Revenue Department",                       frequency: "Once" },
  { code: "PP30",              title: "VAT Filing",                              thai_form_name: "แบบ ภ.พ.30",                category: "Tax & Finance",      document_type: "other",       authority: "Revenue Department",                       frequency: "Monthly" },
  { code: "PND3",              title: "Withholding Tax Filing (PND3)",            thai_form_name: "แบบ ภ.ง.ด.3",              category: "Tax & Finance",      document_type: "other",       authority: "Revenue Department",                       frequency: "Monthly" },
  { code: "PND53",             title: "Withholding Tax Filing (PND53)",           thai_form_name: "แบบ ภ.ง.ด.53",             category: "Tax & Finance",      document_type: "other",       authority: "Revenue Department",                       frequency: "Monthly" },
  { code: "PND50",             title: "Corporate Tax Filing",                    thai_form_name: "แบบ ภ.ง.ด.50",             category: "Tax & Finance",      document_type: "other",       authority: "Revenue Department",                       frequency: "Yearly" },
  { code: "PND51",             title: "Half-Year Corporate Tax",                 thai_form_name: "แบบ ภ.ง.ด.51",             category: "Tax & Finance",      document_type: "other",       authority: "Revenue Department",                       frequency: "Half-yearly" },
  { code: "PP1",               title: "Signboard Tax Filing",                    thai_form_name: null,                         category: "Tax & Finance",      document_type: "other",       authority: "Revenue Department",                       frequency: "Yearly" },
  { code: "SPS101",            title: "SSO Employer Registration",               thai_form_name: "แบบ สปส.1-01",              category: "HR & Immigration",   document_type: "hr",          authority: "Social Security Office",                   frequency: "Once" },
  { code: "SPS103",            title: "SSO Employee Registration",               thai_form_name: "แบบ สปส.1-03",              category: "HR & Immigration",   document_type: "hr",          authority: "Social Security Office",                   frequency: "Once" },
  { code: "SPS110",            title: "SSO Monthly Contribution",                thai_form_name: "แบบ สปส.1-10",              category: "HR & Immigration",   document_type: "hr",          authority: "Social Security Office",                   frequency: "Monthly" },
  { code: "WORK_PERMIT",       title: "Work Permit",                             thai_form_name: "ใบอนุญาตทำงาน",             category: "HR & Immigration",   document_type: "hr",          authority: "Department of Employment",                 frequency: "Yearly" },
  { code: "WP_APP",            title: "Work Permit Application",                 thai_form_name: null,                         category: "HR & Immigration",   document_type: "hr",          authority: "Department of Employment",                 frequency: "One-time" },
  { code: "NON_B",             title: "Visa (Non-Immigrant B)",                  thai_form_name: null,                         category: "HR & Immigration",   document_type: "hr",          authority: "Immigration Bureau",                       frequency: "Case-by-case" },
  { code: "TM7",               title: "Visa Extension",                          thai_form_name: "ตม.7",                       category: "HR & Immigration",   document_type: "hr",          authority: "Immigration Bureau",                       frequency: "Yearly" },
  { code: "TM47",              title: "90-Day Report",                           thai_form_name: "ตม.47",                      category: "HR & Immigration",   document_type: "hr",          authority: "Immigration Bureau",                       frequency: "Every 90 days" },
  { code: "TM8",               title: "Re-Entry Permit",                         thai_form_name: "ตม.8",                       category: "HR & Immigration",   document_type: "hr",          authority: "Immigration Bureau",                       frequency: "Case-by-case" },
  { code: "LEASE",             title: "Lease Agreement",                         thai_form_name: null,                         category: "Lease & Property",   document_type: "contract",    authority: "District Office",                          frequency: "Case-by-case" },
  { code: "HOUSE_REG",         title: "House Registration",                      thai_form_name: null,                         category: "Lease & Property",   document_type: "contract",    authority: "District Office",                          frequency: "Once" },
  { code: "LAND_TITLE",        title: "Land Title",                              thai_form_name: null,                         category: "Lease & Property",   document_type: "contract",    authority: "Department of Lands",                      frequency: "Once" },
  { code: "FOOD_LICENSE",      title: "Restaurant License",                      thai_form_name: "ใบอนุญาตประกอบการร้านอาหาร", category: "Licenses & Ops",     document_type: "license",     authority: "District Office",                          frequency: "Yearly" },
  { code: "FOOD_HANDLER_CARD", title: "Food Handling Certificate",               thai_form_name: null,                         category: "Licenses & Ops",     document_type: "license",     authority: "District Office",                          frequency: "Every 3 years" },
  { code: "SANITATION_REPORT", title: "Health Inspection Report",                thai_form_name: null,                         category: "Licenses & Ops",     document_type: "license",     authority: "District Office",                          frequency: "Case-by-case" },
  { code: "HEALTH_RISK_PERMIT",title: "Health Risk Business Permit",             thai_form_name: null,                         category: "Licenses & Ops",     document_type: "license",     authority: "District Office",                          frequency: "Yearly" },
  { code: "ALCOHOL_LICENSE",   title: "Alcohol License",                         thai_form_name: "ใบอนุญาตขายสุรา",           category: "Licenses & Ops",     document_type: "license",     authority: "Excise Department",                        frequency: "Yearly" },
  { code: "ANIMAL_POSSESSION", title: "Animal Possession Permit",                thai_form_name: "ใบอนุญาตครอบครองสัตว์",    category: "Animal Compliance",  document_type: "permit",      authority: "Department of Livestock Development",      frequency: "Case-by-case" },
  { code: "R7",                title: "Animal Import Permit",                    thai_form_name: "ร.7",                        category: "Animal Compliance",  document_type: "permit",      authority: "Department of Livestock Development",      frequency: "One-time" },
  { code: "ANIMAL_HEALTH_CERT",title: "Animal Health Certificate",               thai_form_name: null,                         category: "Animal Compliance",  document_type: "permit",      authority: "Veterinarian",                             frequency: "Case-by-case" },
  { code: "VET_INSPECTION",    title: "Veterinary Inspection",                   thai_form_name: null,                         category: "Animal Compliance",  document_type: "permit",      authority: "Veterinarian",                             frequency: "Case-by-case" },
  { code: "ANIMAL_VACCINE",    title: "Animal Vaccination Record",               thai_form_name: null,                         category: "Animal Compliance",  document_type: "permit",      authority: "Veterinarian",                             frequency: "Case-by-case" },
  { code: "FIRE_SAFETY",       title: "Fire Safety Certificate",                 thai_form_name: null,                         category: "Safety & Building",  document_type: "certificate", authority: "Local Fire Authority",                     frequency: "Case-by-case" },
  { code: "BUILDING_PERMIT",   title: "Building Permit",                         thai_form_name: null,                         category: "Safety & Building",  document_type: "certificate", authority: "Local Authority",                          frequency: "Once" },
  { code: "BUILDING_INSPECTION",title: "Building Inspection",                    thai_form_name: null,                         category: "Safety & Building",  document_type: "certificate", authority: "Local Authority",                          frequency: "Case-by-case" },
  { code: "EXTINGUISHER_SERVICE",title: "Extinguisher Servicing",                thai_form_name: null,                         category: "Safety & Building",  document_type: "certificate", authority: "Local Authority",                          frequency: "Yearly" },
  { code: "PUBLIC_LIABILITY_INS",title: "Public Liability Insurance",            thai_form_name: null,                         category: "Insurance",          document_type: "insurance",   authority: "Insurance Company",                        frequency: "Yearly" },
  { code: "PROPERTY_INS",      title: "Property Insurance",                      thai_form_name: null,                         category: "Insurance",          document_type: "insurance",   authority: "Insurance Company",                        frequency: "Yearly" },
];

export const CATEGORY_ORDER = [
  "Corporate",
  "Tax & Finance",
  "HR & Immigration",
  "Lease & Property",
  "Licenses & Ops",
  "Animal Compliance",
  "Safety & Building",
  "Insurance",
  "Other",
];

export const ALL_CATEGORIES = CATEGORY_ORDER;
