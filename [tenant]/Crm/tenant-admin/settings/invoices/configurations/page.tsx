"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Typography,
  Breadcrumbs,
  Link,
  TextField,
  Autocomplete,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

import GeneralSettings from "../../../../../../components/TenantAdmin/settings/invoices/GeneralSettings";
import PrintSettings from "../../../../../../components/TenantAdmin/settings/invoices/PrintSettings";
import {
  getConfigDefinitions,
  getCustomerSegments,
  getTemplates,
  getVoucherTypes,
  createVoucherTypeSegmentTemplateAssignment,
  getVoucherTypeSegmentTemplateAssignment,
  updateVoucherTypeSegmentTemplateAssignment,
} from "../../../../../../services/configurations";

interface CustomerSegment {
  id: number;
  status: string;
  segment_name: string;
  selling_channel_id: number;
  selling_channel_name: string;
}

interface GroupedCustomerSegments {
  selling_channel_id: number;
  selling_channel_name: string;
  segments: {
    id: number;
    segment_name: string;
    status: string;
  }[];
}

interface VoucherType {
  id: number;
  type: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const InvoiceSettingsPage = () => {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = pathname?.split("/")[1];

  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";
  const isViewMode = mode === "view";
  const id = searchParams.get("id");

  // Function to group segments by selling channel
  const groupSegmentsByChannel = (
    segments: CustomerSegment[]
  ): GroupedCustomerSegments[] => {
    const channelMap = new Map<number, GroupedCustomerSegments>();

    segments.forEach((segment) => {
      if (!channelMap.has(segment.selling_channel_id)) {
        channelMap.set(segment.selling_channel_id, {
          selling_channel_id: segment.selling_channel_id,
          selling_channel_name: segment.selling_channel_name,
          segments: [],
        });
      }

      const channelGroup = channelMap.get(segment.selling_channel_id)!;
      channelGroup.segments.push({
        id: segment.id,
        segment_name: segment.segment_name,
        status: segment.status,
      });
    });

    return Array.from(channelMap.values());
  };

  const validateConfiguration = (): string[] => {
    const validationErrors: string[] = [];

    // 1. Check mandatory fields
    if (!selectedVoucherTypeId) {
      validationErrors.push("Voucher Type is required");
    }

    if (selectedSegmentId.length === 0) {
      validationErrors.push("Customer Segments are required");
    }

    if (!data.template_id) {
      validationErrors.push("Template is required");
    }

    if (!data.GEN_DOCUMENT_LABEL || data.GEN_DOCUMENT_LABEL.trim() === "") {
      validationErrors.push("Document Label is required");
    }

    // 2. Numbering type specific validation
    if (data.NUM_TYPE === "AUTOMATIC") {
      if (!data.NUM_PREFIX || data.NUM_PREFIX.trim() === "") {
        validationErrors.push(
          "Number Prefix is required when numbering type is Automatic"
        );
      }
      if (!data.NUM_SUFFIX_VALUE || data.NUM_SUFFIX_VALUE.trim() === "") {
        validationErrors.push(
          "Number Suffix Value is required when numbering type is Automatic"
        );
      }
    }
    // Note: For MANUAL type, NUM_PREFIX and NUM_SUFFIX_VALUE are not mandatory

    // 3. Signature display type specific validation
    if (data.SIG_DISPLAY_TYPE === "IMAGE_UPLOAD") {
      if (!data.SIG_IMAGE_DATA || data.SIG_IMAGE_DATA.trim() === "") {
        validationErrors.push(
          "Signature image is required when signature display type is Image Upload"
        );
      }
    }

    if (data.SIG_DISPLAY_TYPE === "PRE-AUTHENTICATED_LABEL") {
      if (
        !data.SIG_PRE_AUTH_LABEL_TEXT ||
        data.SIG_PRE_AUTH_LABEL_TEXT.trim() === ""
      ) {
        validationErrors.push(
          "Pre-authenticated label text is required when signature display type is Pre-authenticated Label"
        );
      }
    }

    return validationErrors;
  };

  const generatePayload = (data: any) => {
    const flattenedData = {
      ...data,
      ...data.printSettings, // Spread printSettings into main object
    };

    delete flattenedData.printSettings;

    const payload = {
      templateAssignment: {
        voucher_type: selectedVoucherTypeId!,
        segment_ids: selectedSegmentId,
        template: data.template_id,
        configuration_name: configurationName,
      },

      // Config values for VoucherTypeSegmentConfigs table
      configValues: configDefinitions
        .filter((def) => flattenedData[def.key_name] !== undefined) // Only include configs that have values
        .map((def) => ({
          setting_def: def.id, // The ID of the setting definition
          voucher_type: selectedVoucherTypeId!, // Non-null assertion since we validated above
          configured_value:
            // Convert the value to appropriate type
            typeof flattenedData[def.key_name] === "boolean" ||
            typeof flattenedData[def.key_name] === "number"
              ? flattenedData[def.key_name]
              : Array.isArray(flattenedData[def.key_name])
              ? flattenedData[def.key_name]
              : flattenedData[def.key_name],
        })),
    };

    console.log("Configuration Payload:", payload);
    return payload;
  };

  const handleSaveConfiguration = async () => {
    // Run validation
    const validationErrors = validateConfiguration();

    // Display validation errors if any
    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      // You might want to show these errors in a toast or alert
      alert(
        "Please fix the following errors:\n\n" + validationErrors.join("\n")
      );
      return;
    }

    if (isEditMode) {
      handleUpdateConfiguration();
      return;
    }

    setSaving(true);
    try {
      const payload = generatePayload(data);

      await createVoucherTypeSegmentTemplateAssignment(payload);

      router.push(`/${tenantSlug}/Crm/tenant-admin/settings/invoices`);
    } catch (error) {
      console.error("Error saving configuration:", error);
      // You might want to show an error message to the user here
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConfiguration = async () => {
    setSaving(true);
    try {
      // Generate the full payload to get the new config values
      const fullPayload = generatePayload(data);

      // Create update payload with only config values that need to be updated
      const updateConfigValues = fullPayload.configValues
        .map((newConfig: any) => {
          // Find the corresponding existing config value by setting_def
          const existingConfig = configValuesBeforeEdit?.find(
            (existing: any) => existing.setting_def === newConfig.setting_def
          );

          return {
            id: existingConfig?.id, // Primary key from the existing config
            setting_def: newConfig.setting_def,
            voucher_type: newConfig.voucher_type,
            configured_value: newConfig.configured_value,
          };
        })
        .filter((config: any) => config.id !== undefined); // Only include configs that have existing IDs

      const updatePayload = {
        configValues: updateConfigValues,
      };

      console.log("Update Configuration Payload:", updatePayload);
      console.log("Config Values Before Edit:", configValuesBeforeEdit);

      // TODO: Call update API
      await updateVoucherTypeSegmentTemplateAssignment(
        Number(id),
        updatePayload
      );

      // Redirect on success
      router.push(`/${tenantSlug}/Crm/tenant-admin/settings/invoices`);
    } catch (error) {
      console.error("Error updating configuration:", error);
      // You might want to show an error message to the user here
    } finally {
      setSaving(false);
    }
  };

  // State for form values
  const [data, setData] = useState<any>({
    /////general settings///////
    NUM_TYPE: "AUTOMATIC",
    NUM_RENUMBER_FREQUENCY: "YEARLY",
    NUM_EMBED_YEAR_POSITION: "NOT_REQUIRED",
    NUM_SEPARATOR: "",
    NUM_YEAR_EMBEDDING_FORMAT: "",
    NUM_PREFIX: "",
    NUM_SUFFIX_VALUE: "",
    NUM_STARTING_VALUE: 1,
    NUM_MIN_SEQUENCE_LENGTH: 1,
    GEN_ROUNDING_METHOD: "NORMAL",
    GEN_ALLOW_BACKDATED_INVOICE: true,
    GEN_DOCUMENT_LABEL: "",
    GEN_BUSINESS_SLOGAN: "",
    GEN_PAYMENT_TERMS_LIST: [],
    ///////print settings///////
    template_id: null,
    printSettings: {},
    ///////additional information//////
    GEN_TERMS_AND_CONDITIONS: "",
    GEN_THANK_YOU_MESSAGE: "",
    GEN_NOTES: "",
    SIG_DISPLAY_TYPE: "NONE",
    SIG_IMAGE_DATA: "",
    SIG_PRE_AUTH_LABEL_TEXT: "",
  });

  // State for dropdown values
  const [selectedSegmentId, setSelectedSegmentId] = useState<number[]>([]);
  const [selectedVoucherTypeId, setSelectedVoucherTypeId] = useState<
    number | null
  >(null);

  const [flatCustomerSegments, setFlatCustomerSegments] = useState<
    GroupedCustomerSegments[]
  >([]);
  const [configurationName, setConfigurationName] = useState<string>("");
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
  const [configDefinitions, setConfigDefinitions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<{
    segments: boolean;
    voucherTypes: boolean;
    configDefinitions: boolean;
  }>({
    segments: false,
    voucherTypes: false,
    configDefinitions: false,
  });
  const [error, setError] = useState<{
    segments: string | null;
    voucherTypes: string | null;
    configDefinitions: string | null;
  }>({
    segments: null,
    voucherTypes: null,
    configDefinitions: null,
  });
  const [configValuesBeforeEdit, setConfigValuesBeforeEdit] =
    useState<any>(null);

  // Fetch all required data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      // Set loading state for all requests
      setLoading({
        segments: true,
        voucherTypes: true,
        configDefinitions: true,
      });

      try {
        // Use Promise.all to fetch all data in parallel
        const [segmentsData, voucherTypesData, configDefinitionsData] =
          await Promise.all([
            getCustomerSegments(),
            getVoucherTypes("Invoice"),
            getConfigDefinitions(),
          ]);

        // Group segments data before setting state
        const groupedSegments = groupSegmentsByChannel(segmentsData);

        // Update state with fetched data
        setFlatCustomerSegments(groupedSegments);
        setVoucherTypes(voucherTypesData.results || []);
        setConfigDefinitions(configDefinitionsData.results || []);
        if (id && isEditMode) {
          fetchConfiguration(Number(id), configDefinitionsData.results);
        }

        // Clear errors
        setError({
          segments: null,
          voucherTypes: null,
          configDefinitions: null,
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        // We can't determine which specific request failed, so we don't set error state here
      } finally {
        // Reset loading state
        setLoading({
          segments: false,
          voucherTypes: false,
          configDefinitions: false,
        });
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!selectedVoucherTypeId) return;
      setTemplatesLoading(true);
      try {
        const data = await getTemplates(selectedVoucherTypeId || undefined);
        setTemplates(data.results || []);
        setTemplatesError(null);
      } catch (err) {
        console.error("Error fetching templates:", err);
        setTemplatesError("Failed to load templates");
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, [selectedVoucherTypeId]);

  const fetchConfiguration = async (id: number, configDefinitions: any[]) => {
    try {
      const response = await getVoucherTypeSegmentTemplateAssignment(id);

      setConfigValuesBeforeEdit(response.config_values);

      setSelectedVoucherTypeId(response.voucher_type);
      setSelectedSegmentId(response.segment_id);
      setConfigurationName(response.configuration_name);

      const ids = response.segments.map((segment: any) => segment.segment_id);
      setSelectedSegmentId(ids);

      const newData = {
        ...data, // Keep existing default values
        template_id: response.template,
        printSettings: {}, // Initialize printSettings
      };

      // Map config_values to data object using setting_def_name as keys
      response.config_values?.forEach((config: any) => {
        const key = config.setting_def_name;
        let value = config.configured_value;

        // Parse specific data types
        if (
          key === "GEN_ALLOW_BACKDATED_INVOICE" ||
          key === "SIG_SHOW_LINE" ||
          key.startsWith("PRINT_") // All PRINT settings are boolean
        ) {
          value = value === "True" || value === true;
        } else if (key === "NUM_STARTING_VALUE") {
          value = parseInt(value, 10);
        } else if (key === "GEN_PAYMENT_TERMS_LIST") {
          try {
            const validJsonString = value.replace(/'/g, '"');
            value = JSON.parse(validJsonString);
          } catch (e) {
            value = [];
          }
        }

        // Find the config definition to check category
        const configDef = configDefinitions.find((def) => def.key_name === key);

        if (configDef && configDef.category === "PRINT") {
          // Put PRINT category configs in printSettings
          newData.printSettings[key] = value;
        } else {
          // Put other configs directly in data
          newData[key] = value;
        }
      });
      setData(newData);
    } catch (error) {
      console.error("Error fetching configuration:", error);
    }
  };

  // Find the currently selected template
  const selectedTemplate =
    templates.find((t) => t.id === data.template_id) || null;

  // Generate sample invoice number based on configuration
  const generateSampleInvoiceNumber = (configData: any) => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    let yearPart = "";

    // Generate year part based on embedding format
    if (configData.NUM_EMBED_YEAR_POSITION !== "NOT_REQUIRED") {
      switch (configData.NUM_YEAR_EMBEDDING_FORMAT) {
        case "YY-YY":
          yearPart = `${currentYear.toString().slice(-2)}${
            configData.NUM_SEPARATOR || "-"
          }${nextYear.toString().slice(-2)}`;
          break;
        case "YYYY-YY":
          yearPart = `${currentYear}${configData.NUM_SEPARATOR || "-"}${nextYear
            .toString()
            .slice(-2)}`;
          break;
        case "YYYY":
          yearPart = currentYear.toString();
          break;
        default:
          yearPart = "";
      }
    }

    // Generate sequence number with proper padding
    const minLength = parseInt(configData.NUM_MIN_SEQUENCE_LENGTH) || 1;
    const sequenceNumber = (configData.NUM_STARTING_VALUE || 1)
      .toString()
      .padStart(minLength, "0");

    // Combine all parts based on year position
    let invoiceNumber = "";
    const prefix = configData.NUM_PREFIX || "";
    const suffix = configData.NUM_SUFFIX_VALUE || "";
    const separator = configData.NUM_SEPARATOR || "";

    if (configData.NUM_EMBED_YEAR_POSITION === "AS_PREFIX" && yearPart) {
      invoiceNumber = `${yearPart}${separator}${prefix}${sequenceNumber}${suffix}`;
    } else if (configData.NUM_EMBED_YEAR_POSITION === "AS_SUFFIX" && yearPart) {
      invoiceNumber = `${prefix}${sequenceNumber}${suffix}${separator}${yearPart}`;
    } else {
      invoiceNumber = `${prefix}${sequenceNumber}${suffix}`;
    }

    return invoiceNumber || "INV-2025-001"; // Fallback if no configuration
  };

  // Sample data for invoice preview - now uses actual configuration data
  const getSampleInvoiceData = (configData: any) => {
    return {
      // Document settings from actual configuration
      document_label: configData.GEN_DOCUMENT_LABEL || "TAX INVOICE",

      // Configuration flags from actual data
      GEN_DOCUMENT_LABEL: configData.GEN_DOCUMENT_LABEL || "TAX INVOICE",
      GEN_TERMS_AND_CONDITIONS: configData.GEN_TERMS_AND_CONDITIONS || "",
      GEN_THANK_YOU_MESSAGE: configData.GEN_THANK_YOU_MESSAGE || "",

      // Print settings from actual configuration
      PRINT_SHOW_AMOUNT_IN_WORDS:
        configData.printSettings?.PRINT_SHOW_AMOUNT_IN_WORDS ?? true,
      PRINT_SHOW_COMPANY_ADDRESS:
        configData.printSettings?.PRINT_SHOW_COMPANY_ADDRESS ?? true,
      PRINT_SHOW_COMPANY_CONTACT:
        configData.printSettings?.PRINT_SHOW_COMPANY_CONTACT ?? true,
      PRINT_SHOW_ITEM_DISCOUNT:
        configData.printSettings?.PRINT_SHOW_ITEM_DISCOUNT ?? true,
      PRINT_SHOW_ITEM_DESCRIPTION:
        configData.printSettings?.PRINT_SHOW_ITEM_DESCRIPTION ?? true,
      PRINT_SHOW_ITEM_UOM:
        configData.printSettings?.PRINT_SHOW_ITEM_UOM ?? true,
      PRINT_SHOW_PO_NUMBER:
        configData.printSettings?.PRINT_SHOW_PO_NUMBER ?? true,
      PRINT_SHOW_POS_STATE:
        configData.printSettings?.PRINT_SHOW_POS_STATE ?? true,
      PRINT_SHOW_ROUNDING_ADJUSTMENT:
        configData.printSettings?.PRINT_SHOW_ROUNDING_ADJUSTMENT ?? true,
      PRINT_SHOW_SALES_PERSON:
        configData.printSettings?.PRINT_SHOW_SALES_PERSON ?? true,
      PRINT_SHOW_SHIPPING_ADDRESS:
        configData.printSettings?.PRINT_SHOW_SHIPPING_ADDRESS ?? true,

      // Signature settings from actual configuration
      SIG_DISPLAY_TYPE: configData.SIG_DISPLAY_TYPE || "NONE",
      SIG_PRE_AUTH_LABEL_TEXT: configData.SIG_PRE_AUTH_LABEL_TEXT || "",
      SIG_IMAGE_DATA: configData.SIG_IMAGE_DATA || "",

      // Static company and buyer data (would come from company settings in real app)
      company: {
        name: "Turtle Software Pvt. Ltd.",
        address: "A-903, Shubham Heights 1, Puna Kumbhariya Road, Surat-395010",
        contact_details:
          "Mo. : 9510715213, Email : karnavati.agencies@gmail.com",
        state: "Gujarat (24)",
        gstin: "24ASNPS6244D1ZL",
      },
      buyer: {
        name: "QuickAssist Online Service Pvt. Ltd.",
        address: "A-903, Shubham Heights 1, Puna Kumbhariya Road, Surat-395010",
        state: "Gujarat (24)",
        gstin: "24ASNPS6244D1ZL",
      },
      // Invoice details with dynamic invoice number
      invoice: {
        number: generateSampleInvoiceNumber(configData),
        date: new Date().toLocaleDateString("en-GB"),
        due_date: new Date(
          Date.now() + 15 * 24 * 60 * 60 * 1000
        ).toLocaleDateString("en-GB"),
        po_number: "PO-2025-123",
        eway_bill: "123456789012",
      },
      shipping: {
        address_line1: "Jay Agency A-903, Shubham Heights 1, Puna Kumbhariya",
        address_line2: "Road, Surat-395010",
      },
      // Sample invoice items
      invoice_items: [
        {
          name: "Software Development Services",
          description: "Full-stack web application development",
          hsn_sac: "998314",
          quantity: "1.00",
          uom: "Nos",
          list_price: "10,000.00",
          discount: "0.00",
          tax_rate: "18",
          tax_amount: "1,800.00",
          total_amount: "11,800.00",
        },
        {
          name: "Technical Support",
          description: "24/7 technical support and maintenance",
          hsn_sac: "998314",
          quantity: "2.00",
          uom: "Months",
          list_price: "5,000.00",
          discount: "5.00",
          tax_rate: "18",
          tax_amount: "1,710.00",
          total_amount: "11,210.00",
        },
      ],
      tax_summary: [
        {
          rate: "18",
          taxable_amount: "19,500.00",
          cgst_amount: "1,755.00",
          sgst_amount: "1,755.00",
          total_tax: "3,510.00",
        },
      ],
      totals: {
        subtotal: "20,000.00",
        discount_rate: "2.50",
        discount_amount: "500.00",
        cgst_rate: "9.00",
        cgst_amount: "1,755.00",
        sgst_rate: "9.00",
        sgst_amount: "1,755.00",
        rounding_off: "1.00",
        rounding_sign: "+",
        final_amount: "23,010.00",
      },
      payment_methods: [
        "Bank Transfer: Account No. 1234567890",
        "UPI: turtle@paytm",
        "Cheque payable to 'Turtle Software Pvt. Ltd.'",
      ],
    };
  };

  // Convert amount to words
  const convertAmountToWords = (amount: string): string => {
    const numericAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numericAmount)) return "";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const convertHundreds = (num: number): string => {
      let result = "";
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + " Hundred ";
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + " ";
        num %= 10;
      }
      if (num > 0) {
        result += ones[num] + " ";
      }
      return result;
    };

    const convertToWords = (num: number): string => {
      if (num === 0) return "Zero";

      let result = "";
      let crores = Math.floor(num / 10000000);
      let lakhs = Math.floor((num % 10000000) / 100000);
      let thousands = Math.floor((num % 100000) / 1000);
      let hundreds = num % 1000;

      if (crores > 0) {
        result += convertHundreds(crores) + "Crore ";
      }
      if (lakhs > 0) {
        result += convertHundreds(lakhs) + "Lakh ";
      }
      if (thousands > 0) {
        result += convertHundreds(thousands) + "Thousand ";
      }
      if (hundreds > 0) {
        result += convertHundreds(hundreds);
      }

      return result.trim();
    };

    const rupees = Math.floor(numericAmount);
    const paise = Math.round((numericAmount - rupees) * 100);

    let result = "Rupees " + convertToWords(rupees);
    if (paise > 0) {
      result += " and " + convertToWords(paise) + " Paise";
    }
    result += " Only";

    return result;
  };

  // Function to replace template placeholders with actual data
  const renderTemplate = (templateCode: string, data: any): string => {
    let renderedHtml = templateCode;

    // Handle loops first - {% for item in array %}
    renderedHtml = renderedHtml.replace(
      /\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g,
      (match, itemVar, arrayVar, content) => {
        // Look for array in nested data structure
        let array = data[arrayVar];

        // If not found at root, check common nested locations
        if (!array) {
          // Check if it's a nested property
          const nestedPaths = [
            `tax_summary`,
            `terms_conditions`,
            `payment_methods`,
            `invoice_items`,
          ];

          for (const path of nestedPaths) {
            if (arrayVar === path && data[path]) {
              array = data[path];
              break;
            }
          }
        }

        if (!Array.isArray(array)) return "";

        return array
          .map((item: any, index: number) => {
            let itemContent = content;

            // Replace {{itemVar.property}} with actual values (e.g., {{tax.rate}}, {{method}})
            const itemVarRegex = new RegExp(
              `\\{\\{${itemVar}(?:\\.(\\w+))?\\}\\}`,
              "g"
            );
            itemContent = itemContent.replace(
              itemVarRegex,
              (match: string, prop: string) => {
                if (prop) {
                  // Handle {{itemVar.property}}
                  return item[prop] !== undefined ? String(item[prop]) : match;
                } else {
                  // Handle {{itemVar}} for simple arrays (like payment_methods)
                  return typeof item === "string" ? item : String(item);
                }
              }
            );

            // Replace {{loop.index}} with 1-based index
            itemContent = itemContent.replace(
              /\{\{loop\.index\}\}/g,
              String(index + 1)
            );

            return itemContent;
          })
          .join("");
      }
    );

    // Handle conditional blocks - {% if condition %} with optional {% elif %} and {% else %}
    renderedHtml = renderedHtml.replace(
      /\{%\s*if\s+([^%]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
      (outerMatch, condition, content) => {
        // Parse if/elif/else blocks
        const blocks: Array<{ condition?: string; content: string }> = [];
        let remainingContent = content;

        // Split by elif and else
        const elifPattern = /\{%\s*elif\s+([^%]+)\s*%\}/g;
        const elsePattern = /\{%\s*else\s*%\}/;

        let currentContent = "";
        let lastIndex = 0;
        let elifMatch: RegExpExecArray | null;

        // Process elif blocks
        while ((elifMatch = elifPattern.exec(remainingContent)) !== null) {
          // Add current block (if or previous elif)
          currentContent = remainingContent.slice(lastIndex, elifMatch.index);
          if (blocks.length === 0) {
            blocks.push({
              condition: condition.trim(),
              content: currentContent,
            });
          } else {
            blocks[blocks.length - 1].content = currentContent;
          }

          // Add elif block
          blocks.push({ condition: elifMatch[1].trim(), content: "" });
          lastIndex = elifMatch.index + elifMatch[0].length;
        }

        // Check for else block
        const elseMatch = remainingContent.slice(lastIndex).match(elsePattern);
        if (elseMatch && elseMatch.index !== undefined) {
          const beforeElse = remainingContent.slice(
            lastIndex,
            lastIndex + elseMatch.index
          );
          const afterElse = remainingContent.slice(
            lastIndex + elseMatch.index + elseMatch[0].length
          );

          if (blocks.length === 0) {
            blocks.push({ condition: condition.trim(), content: beforeElse });
          } else {
            blocks[blocks.length - 1].content = beforeElse;
          }
          blocks.push({ content: afterElse }); // else block has no condition
        } else {
          // No else block, just add remaining content
          const finalContent = remainingContent.slice(lastIndex);
          if (blocks.length === 0) {
            blocks.push({ condition: condition.trim(), content: finalContent });
          } else {
            blocks[blocks.length - 1].content = finalContent;
          }
        }

        // Evaluate conditions and return appropriate content
        for (const block of blocks) {
          if (!block.condition) {
            // This is an else block
            return block.content;
          }

          if (evaluateCondition(block.condition, data)) {
            return block.content;
          }
        }

        return ""; // No condition matched and no else block
      }
    );

    // Helper function to evaluate conditions
    function evaluateCondition(conditionPath: string, data: any): boolean {
      // Handle complex conditions
      if (conditionPath.includes(" == ")) {
        const [varPart, valuePart] = conditionPath.split(" == ");
        const varName = varPart.trim();
        const expectedValue = valuePart.trim().replace(/^'|'$/g, ""); // Remove quotes
        return data[varName] === expectedValue;
      }

      if (conditionPath.includes("and") || conditionPath.includes("!=")) {
        if (conditionPath.includes("!= 'NONE'")) {
          const varName = conditionPath.split(" ")[0];
          const value = data[varName];
          return value && value !== "NONE";
        }
        if (conditionPath.includes(" and ")) {
          const parts = conditionPath.split(" and ");
          return parts.every((part: string) => {
            const trimmedPart = part.trim();
            if (trimmedPart.includes(" == ")) {
              return evaluateCondition(trimmedPart, data);
            }
            return !!data[trimmedPart];
          });
        }
      }

      // Simple variable evaluation
      const keys = conditionPath.split(".");
      let value = data;
      for (const key of keys) {
        if (value && typeof value === "object") {
          value = value[key];
        } else {
          return false;
        }
      }
      return !!value;
    }

    // Handle amount_in_words conversion if PRINT_SHOW_AMOUNT_IN_WORDS is true
    if (data.PRINT_SHOW_AMOUNT_IN_WORDS && data.totals?.final_amount) {
      data.amount_in_words = convertAmountToWords(data.totals.final_amount);
    }

    // Replace single variables like {{variable}} - do this last to avoid conflicts
    renderedHtml = renderedHtml.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split(".");
      let value = data;

      for (const key of keys) {
        if (value && typeof value === "object") {
          value = value[key];
        } else {
          return match; // Return original if path doesn't exist
        }
      }

      return value !== undefined ? String(value) : match;
    });

    return renderedHtml;
  };

  const handlePreviewInvoice = () => {
    if (!selectedTemplate || !selectedTemplate.code) {
      alert("Please select a template first");
      return;
    }

    // Use actual configuration data for the preview
    const sampleData = getSampleInvoiceData(data);
    console.log(sampleData);
    const renderedHtml = renderTemplate(selectedTemplate.code, sampleData);

    // Open in new tab
    const newTab = window.open("", "_blank");
    if (newTab) {
      newTab.document.write(renderedHtml);
      newTab.document.close();
    }
  };

  return (
    <Box>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link
          color="inherit"
          href={`/${tenantSlug}/Crm`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            router.push(`/${tenantSlug}/Crm`);
          }}
        >
          Dashboard
        </Link>
        <Link
          color="inherit"
          href={`/${tenantSlug}/Crm/tenant-admin/settings`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            router.push(`/${tenantSlug}/Crm/tenant-admin/settings`);
          }}
        >
          Settings
        </Link>
        <Link
          color="inherit"
          href={`/${tenantSlug}/Crm/tenant-admin/settings/invoices`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            router.push(`/${tenantSlug}/Crm/tenant-admin/settings/invoices`);
          }}
        >
          Invoice Configurations
        </Link>
        <Typography color="text.primary">
          {isEditMode ? "Edit" : "Add"} Configuration
        </Typography>
      </Breadcrumbs>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5">Invoice Configurations</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" onClick={handlePreviewInvoice}>
            Invoice Preview
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveConfiguration}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </Box>
      </Box>

      {/* Settings Sections */}
      <Grid container spacing={2}>
        <Grid size={6}>
          <Box
            sx={{
              backgroundColor: "#fff",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container columnSpacing={2}>
              <Grid size={6}>
                <TextField
                  label="Configuration Name"
                  value={configurationName}
                  onChange={(e) => setConfigurationName(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: "0px" }}
                  disabled={isEditMode}
                />
              </Grid>
              <Grid size={6}>
                <Autocomplete
                  id="voucher-type-select"
                  options={voucherTypes}
                  loading={loading.voucherTypes}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  value={
                    voucherTypes.find((v) => v.id === selectedVoucherTypeId) ||
                    null
                  }
                  onChange={(_, newValue) => {
                    setSelectedVoucherTypeId(newValue ? newValue.id : null);
                  }}
                  disabled={isEditMode}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select voucher type"
                      error={!!error.voucherTypes}
                      helperText={error.voucherTypes}
                      fullWidth
                      sx={{ mb: "0px" }}
                      size="small"
                      label="Voucher Type"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading.voucherTypes && (
                              <CircularProgress size={20} />
                            )}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              backgroundColor: "#fff",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Autocomplete
              id="customer-segment-select"
              multiple
              disableCloseOnSelect
              options={
                // Create flat array of all segments from grouped structure
                flatCustomerSegments.flatMap((channel) =>
                  channel.segments.map((segment) => ({
                    ...segment,
                    selling_channel_id: channel.selling_channel_id,
                    selling_channel_name: channel.selling_channel_name,
                  }))
                )
              }
              loading={loading.segments}
              getOptionLabel={(option) => option.segment_name}
              groupBy={(option) => {
                // Use selling_channel_id as the unique group identifier
                return option.selling_channel_id.toString();
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={
                // Create flat array and filter selected segments
                flatCustomerSegments
                  .flatMap((channel) =>
                    channel.segments.map((segment) => ({
                      ...segment,
                      selling_channel_id: channel.selling_channel_id,
                      selling_channel_name: channel.selling_channel_name,
                    }))
                  )
                  .filter((s) => selectedSegmentId.includes(s.id))
              }
              limitTags={2}
              onChange={(_, newValue) => {
                if (newValue.length === 0) {
                  // Allow clearing all selections
                  setSelectedSegmentId([]);
                  return;
                }

                // Get the selling channel of the first selected item
                const firstChannelId = newValue[0].selling_channel_id;

                // Check if all selected items belong to the same selling channel
                const allSameChannel = newValue.every(
                  (segment) => segment.selling_channel_id === firstChannelId
                );

                if (allSameChannel) {
                  // All segments belong to the same channel, update selection
                  setSelectedSegmentId(newValue.map((segment) => segment.id));
                } else {
                  // Mixed channels detected, keep only the newly added segment's channel
                  const latestSegment = newValue[newValue.length - 1];
                  const sameChanelSegments = newValue.filter(
                    (segment) =>
                      segment.selling_channel_id ===
                      latestSegment.selling_channel_id
                  );
                  setSelectedSegmentId(
                    sameChanelSegments.map((segment) => segment.id)
                  );
                }
              }}
              disabled={isEditMode}
              renderGroup={(params) => {
                // Find the selling_channel_name for this group ID
                const channelId = parseInt(params.group);
                const channel = flatCustomerSegments.find(
                  (ch) => ch.selling_channel_id === channelId
                );
                const channelName = channel
                  ? channel.selling_channel_name
                  : "Unknown";

                return (
                  <li key={params.key}>
                    <div
                      style={{
                        position: "sticky",
                        top: 0,
                        padding: "8px 16px",
                        backgroundColor: "#f5f5f5",
                        fontWeight: "bold",
                        fontSize: "0.875rem",
                        color: "#666",
                        borderBottom: "1px solid #e0e0e0",
                        zIndex: 10,
                      }}
                    >
                      {channelName}
                    </div>
                    <ul style={{ padding: 0 }}>{params.children}</ul>
                  </li>
                );
              }}
              renderOption={(props, option, { selected }) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Checkbox style={{ marginRight: 8 }} checked={selected} />
                    {option.segment_name}
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select customer segments"
                  error={!!error.segments}
                  helperText={
                    error.segments ||
                    "You can only select segments from the same selling channel"
                  }
                  fullWidth
                  sx={{ mb: "0px" }}
                  size="small"
                  label="Customer Segments"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading.segments && <CircularProgress size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <GeneralSettings data={data} setData={setData} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PrintSettings
            isEditMode={isEditMode}
            data={data}
            setData={setData}
            configDefinitions={configDefinitions}
            templates={templates}
            templatesLoading={templatesLoading}
            templatesError={templatesError}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoiceSettingsPage;
