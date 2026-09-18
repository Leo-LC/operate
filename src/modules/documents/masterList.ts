export interface MasterDocument {
  code: string;
  title: string;
  thai_form_name: string | null;
  category: string;
  document_type: string;
  authority: string;
  frequency: string;
  notes: string | null;
}

export const MASTER_DOCUMENTS: MasterDocument[] = [
  { code: "DBD_CERT",           title: "DBD - Company Registration Certificate",       thai_form_name: "หนังสือรับรองนิติบุคคล / หนังสือรับรองบริษัท",                    category: "Corporate",            document_type: "legal",       authority: "Department of Business Development (DBD)", frequency: "Once",         notes: "On-demand corporate document; often requested as a recent copy" },
  { code: "PP20",               title: "VAT Registration",                             thai_form_name: "ภ.พ.20 (PP.20)",                                              category: "Tax & Finance",        document_type: "other",       authority: "Revenue Department",                        frequency: "Once",         notes: "Base VAT registration certificate" },
  { code: "SPS101",             title: "SSO Employer Registration",                    thai_form_name: "สปส.1-01 (SorPorSor 1-01)",                                   category: "HR & Immigration",     document_type: "hr",          authority: "Social Security Office",                      frequency: "Once",         notes: "Employer registration" },
  { code: "SPS103",             title: "SSO Employee Registration",                    thai_form_name: "สปส.1-03 (SorPorSor 1-03)",                                   category: "HR & Immigration",     document_type: "hr",          authority: "Social Security Office",                      frequency: "Once",         notes: "Per employee" },
  { code: "LEASE",              title: "Lease Agreement",                              thai_form_name: "สัญญาเช่า",                                                   category: "Lease & Property",     document_type: "contract",    authority: "Private",                                     frequency: "Once",         notes: "Track lease end / renewal date" },
  { code: "HOUSE_REG",          title: "House Registration",                           thai_form_name: "ทะเบียนบ้าน",                                                 category: "Lease & Property",     document_type: "contract",    authority: "District Office",                               frequency: "Once",         notes: "Reference property document" },
  { code: "LAND_TITLE",         title: "Land Title",                                   thai_form_name: "โฉนดที่ดิน",                                                  category: "Lease & Property",     document_type: "contract",    authority: "Department of Lands",                         frequency: "Once",         notes: "Reference property document" },
  { code: "FOOD_LICENSE",       title: "Restaurant License",                           thai_form_name: "ใบอนุญาตจำหน่ายอาหาร / หนังสือรับรองการแจ้งจัดตั้งสถานที่จำหน่ายอาหาร", category: "Licenses & Operations", document_type: "license",   authority: "District Office",                               frequency: "Yearly",       notes: "1-year license; renew before expiry" },
  { code: "HEALTH_RISK_PERMIT", title: "Health Risk Business Permit",                  thai_form_name: "ใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ",                 category: "Licenses & Operations", document_type: "license",   authority: "District Office",                               frequency: "Yearly",       notes: "1-year permit; renewal should be filed within 90 days before expiry" },
  { code: "FOOD_HANDLER_CARD",  title: "Food Handling Certificate",                    thai_form_name: "ใบรับรองผู้สัมผัสอาหาร / บัตรประจำตัวผู้สัมผัสอาหาร",        category: "Licenses & Operations", document_type: "license",   authority: "District Office",                               frequency: "Every 3 years", notes: "In Bangkok, food handler card validity is 3 years" },
  { code: "ANIMAL_POSSESSION",  title: "Animal Possession Permit",                     thai_form_name: "ใบอนุญาตครอบครองสัตว์",                                     category: "Animal Compliance",    document_type: "permit",      authority: "Department of Livestock Development",       frequency: "Once",         notes: "Exact permit depends on species / setup" },
  { code: "BUILDING_PERMIT",    title: "Building Permit",                              thai_form_name: "ใบอนุญาตก่อสร้าง",                                            category: "Safety & Building",    document_type: "certificate", authority: "District Office",                               frequency: "Once",         notes: "Reference building document" },
  { code: "INSURANCE",          title: "Property & Public Liability Insurance",        thai_form_name: "กรมธรรม์ประกันทรัพย์สิน",                                    category: "Insurance",            document_type: "insurance",   authority: "Insurance Company",                           frequency: "Yearly",       notes: "Track policy end date" },
];

export const CATEGORY_ORDER = [
  "Corporate",
  "Tax & Finance",
  "HR & Immigration",
  "Lease & Property",
  "Licenses & Operations",
  "Animal Compliance",
  "Safety & Building",
  "Insurance",
  "Other",
];

export const ALL_CATEGORIES = CATEGORY_ORDER;
