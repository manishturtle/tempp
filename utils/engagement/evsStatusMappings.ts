/**
 * Email Verification Status Mappings
 * 
 * This utility provides functions to translate technical subStatus codes from the API
 * into user-friendly display strings and detailed tooltip content for the UI.
 */

export interface SubStatusDisplayInfo {
  displayString: string;
  tooltipContent: string;
  // Optional: severity for UI hints, e.g., 'info', 'warning', 'error'
  severity?: 'info' | 'warning' | 'error' | 'success';
}

// This map stores the technical subStatus code (from API) as key
const subStatusMappings: Record<string, SubStatusDisplayInfo> = {
  // Valid Statuses
  "Deliverable": {
    displayString: "Deliverable",
    tooltipContent: "This email address appears valid and ready to receive emails. Our checks confirmed the mailbox exists.",
    severity: "success"
  },
  "Deliverable_RoleAccount": {
    displayString: "Deliverable (Role Account)",
    tooltipContent: "This email address is valid and can receive emails. It's identified as a role-based account (e.g., info@, support@), possibly managed by a team.",
    severity: "success"
  },

  // Invalid Statuses
  "SyntaxError": {
    displayString: "Invalid Format",
    tooltipContent: "The format of this email address is incorrect (e.g., missing '@' symbol, invalid characters, or wrong structure).",
    severity: "error"
  },
  "DomainInvalid_NXDOMAIN": {
    displayString: "Domain Does Not Exist",
    tooltipContent: "The domain name (e.g., example.com) for this email address does not exist or could not be found in the DNS.",
    severity: "error"
  },
  "DomainInvalid_NullMX": {
    displayString: "Domain Does Not Accept Email",
    tooltipContent: "This email's domain is configured to explicitly not accept any emails (Null MX record found).",
    severity: "error"
  },
  "DomainInvalid_NoMailServers": {
    displayString: "No Mail Servers for Domain",
    tooltipContent: "The domain for this email exists, but no mail servers (MX or A records) are configured to accept email for it.",
    severity: "error"
  },
  "MailboxDoesNotExist": {
    displayString: "Mailbox Does Not Exist",
    tooltipContent: "The recipient's mail server reported that this specific email address (mailbox) does not exist (e.g., due to an SMTP 550 'User unknown' error).",
    severity: "error"
  },
  "HardBounce_TenantList": {
    displayString: "Previously Hard Bounced (Your List)",
    tooltipContent: "This email address is on your organization's internal list of emails that previously resulted in a hard bounce.",
    severity: "error"
  },
  "MailboxFull_Permanent": {
    displayString: "Mailbox Full (Permanent)",
    tooltipContent: "The recipient's mailbox has exceeded its storage quota, and the mail server is permanently rejecting new emails.",
    severity: "error"
  },

  // Risky Statuses
  "DisposableEmail": {
    displayString: "Disposable Email Provider",
    tooltipContent: "This email address appears to be from a disposable or temporary email provider, not recommended for long-term communication.",
    severity: "warning"
  },
  "BlockedByTenant_ExclusionList": {
    displayString: "On Your Exclusion List",
    tooltipContent: "This email address is on your organization's internal exclusion or block list.",
    severity: "warning"
  },
  "CatchAll": {
    displayString: "Catch-All Domain",
    tooltipContent: "The recipient's mail server accepts emails for any address on this domain. Mailbox existence isn't fully confirmed. These can sometimes be unmonitored.",
    severity: "warning"
  },
  "MailboxFull_Temporary": {
    displayString: "Mailbox Full (Temporary)",
    tooltipContent: "The recipient's mailbox has exceeded its storage quota and is temporarily rejecting emails. It might accept emails later if space is cleared.",
    severity: "warning"
  },

  // Unknown Statuses (can be merged for UI display)
  "DNSError_Timeout": { 
    displayString: "Domain DNS Issue", 
    tooltipContent: "We could not verify the email's domain because the DNS query timed out. This might be a temporary network issue.",
    severity: "info"
  },
  "DNSError_ServerFailure": { 
    displayString: "Domain DNS Issue", 
    tooltipContent: "The DNS servers for the email's domain reported an error, preventing domain validation. This might be a temporary issue.",
    severity: "info"
  },
  "DNSError_Unclassified": { 
    displayString: "Domain DNS Issue", 
    tooltipContent: "An unclassified error occurred during the DNS lookup for the email's domain.",
    severity: "info"
  },
  "SMTPServerNotResponding_AllMX": { 
    displayString: "Mail Server(s) Unreachable", 
    tooltipContent: "We could not connect to any mail servers for this email's domain. They may be temporarily offline.",
    severity: "info"
  },
  "MailboxUnavailable_SMTP_Temporary_XYZ": { 
    displayString: "Mailbox Temporarily Unavailable", 
    tooltipContent: "The recipient's mail server responded with a temporary error indicating the mailbox is currently unavailable but might accept email later.",
    severity: "info"
  },
  "Greylisted_SMTP_Temporary": { 
    displayString: "Greylisted (Temporary Deferral)", 
    tooltipContent: "The recipient's mail server is using 'greylisting,' a common anti-spam measure where emails from new senders are temporarily deferred. Retrying verification later might yield a different result.",
    severity: "info"
  },
  "Timeout_SMTP": { 
    displayString: "Mail Server Connection Timed Out", 
    tooltipContent: "Our connection to the recipient's mail server timed out during SMTP verification.",
    severity: "info"
  },

  "AIServiceUnavailable": { 
    displayString: "Verification Inconclusive", 
    tooltipContent: "Our advanced AI analysis service was temporarily unavailable, preventing a full assessment for certain risk factors.",
    severity: "info"
  },
  "ProcessingError_Orchestration": { 
    displayString: "Processing Issue", 
    tooltipContent: "An unexpected internal error occurred in our system while trying to verify this email.",
    severity: "info"
  },
  "CreditDeductionFailed_PostVerification": { 
    displayString: "Processing Issue", 
    tooltipContent: "Verification was attempted, but a credit deduction issue occurred. Please check your account or contact support.",
    severity: "info"
  },
  "ChecksInconclusive_Final": { 
    displayString: "Verification Inconclusive", 
    tooltipContent: "After all checks, we could not definitively determine the status of this email address.",
    severity: "info"
  },
  "SMTPCheckSkipped_MissingDomainOrMX": { 
    displayString: "Verification Inconclusive", 
    tooltipContent: "The SMTP check could not be performed because domain or MX record information was not valid.",
    severity: "info"
  },
  "SMTPCheckSkipped_PriorClassification": { 
    displayString: "Verification Inconclusive", 
    tooltipContent: "Further checks were not performed due to an earlier conclusive assessment.",
    severity: "info"
  },

  // Default/Fallback
  "Unknown_SubStatus": { 
    displayString: "Unknown Status Detail", 
    tooltipContent: "The specific reason for this status is not detailed.",
    severity: "info"
  }
};

/**
 * Gets the user-friendly display information for a given technical subStatus code.
 * 
 * @param apiSubStatus - The technical subStatus code from the API
 * @returns SubStatusDisplayInfo containing the user-friendly display string and tooltip content
 */
export function getSubStatusDisplayInfo(apiSubStatus: string | null | undefined): SubStatusDisplayInfo {
  const defaultInfo: SubStatusDisplayInfo = {
    displayString: apiSubStatus || "Not Available",
    tooltipContent: "No detailed explanation available for this sub-status.",
    severity: "info"
  };

  if (!apiSubStatus) return defaultInfo;

  // Direct match
  if (subStatusMappings[apiSubStatus]) {
    return subStatusMappings[apiSubStatus];
  }

  // Pattern matching for SMTP codes like MailboxDoesNotExist_SMTP_550 or MailboxUnavailable_SMTP_Temporary_450
  if (apiSubStatus.startsWith("MailboxDoesNotExist_SMTP_")) {
    return subStatusMappings["MailboxDoesNotExist"] || defaultInfo;
  }
  if (apiSubStatus.startsWith("MailboxUnavailable_SMTP_Temporary_")) {
    return subStatusMappings["MailboxUnavailable_SMTP_Temporary_XYZ"] || defaultInfo;
  }

  // Pattern matching for DNS errors
  if (apiSubStatus.startsWith("DNSError_")) {
    // Default to the first DNS error if the specific one isn't found
    return subStatusMappings["DNSError_Timeout"] || defaultInfo;
  }

  // If no specific mapping, try to make the raw subStatus somewhat readable
  const readableFallback = apiSubStatus.replace(/_/g, ' '); // Replace underscores with spaces
  return {
    displayString: readableFallback,
    tooltipContent: `Technical sub-status: ${apiSubStatus}. No further user-friendly explanation available yet.`,
    severity: "info"
  };
}

/**
 * Gets a color for the status based on the status severity.
 * 
 * @param severity - The severity level from SubStatusDisplayInfo
 * @returns A MUI color string (can be used with Chip, Typography, etc.)
 */
export function getStatusSeverityColor(severity: SubStatusDisplayInfo['severity']): string {
  switch (severity) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
    default:
      return 'info';
  }
}

/**
 * Helper function to get the display information and color in one call.
 * 
 * @param apiSubStatus - The technical subStatus code from the API
 * @returns Object containing displayInfo and color
 */
export function getSubStatusDisplayWithColor(apiSubStatus: string | null | undefined) {
  const displayInfo = getSubStatusDisplayInfo(apiSubStatus);
  const color = getStatusSeverityColor(displayInfo.severity);
  return {
    displayInfo,
    color
  };
}

/**
 * Maps a job status to a user-friendly display and color.
 * 
 * @param status - The job status from the API
 * @returns Object with display string, color, and tooltip content
 */
export function getJobStatusDisplay(status: string) {
  switch (status) {
    case 'Completed':
      return {
        displayString: 'Completed',
        color: 'success',
        tooltipContent: 'The job has successfully processed all emails.'
      };
    case 'Failed':
      return {
        displayString: 'Failed',
        color: 'error',
        tooltipContent: 'The job encountered an error and could not be completed.'
      };
    case 'Processing':
      return {
        displayString: 'Processing',
        color: 'primary',
        tooltipContent: 'The job is currently being processed.'
      };
    case 'Queued':
      return {
        displayString: 'Queued',
        color: 'warning',
        tooltipContent: 'The job is in the queue and will be processed soon.'
      };
    case 'PartiallyCompleted_OutOfCredits':
      return {
        displayString: 'Partially Completed',
        color: 'warning',
        tooltipContent: 'The job was stopped because you ran out of credits. Add more credits to continue.'
      };
    default:
      return {
        displayString: status,
        color: 'default',
        tooltipContent: `Status: ${status}`
      };
  }
}
