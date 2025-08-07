"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  TextField,
  FormHelperText,
  InputLabel,
  Switch,
  Checkbox,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";

interface GeneralSettingsProps {
  data: any;
  setData: any;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ data, setData }) => {
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [newRowData, setNewRowData] = useState({ label: "", days: "" });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [isEditingThankYou, setIsEditingThankYou] = useState(false);
  const [isEditingCustomerNotes, setIsEditingCustomerNotes] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddNewRow = () => {
    setIsAddingNew(true);
    setNewRowData({ label: "", days: "" });
  };

  const handleSaveNewRow = () => {
    if (newRowData.label.trim() && newRowData.days.trim()) {
      const newPaymentTerm = {
        label: newRowData.label.trim(),
        days: parseInt(newRowData.days) || 0,
        id: Date.now(), // Simple ID generation
      };
      setData((prev: any) => ({
        ...prev,
        GEN_PAYMENT_TERMS_LIST: [
          ...(prev.GEN_PAYMENT_TERMS_LIST || []),
          newPaymentTerm,
        ],
      }));
      setIsAddingNew(false);
      setNewRowData({ label: "", days: "" });
    }
  };

  const handleCancelNewRow = () => {
    setIsAddingNew(false);
    setNewRowData({ label: "", days: "" });
  };

  const handleEditRow = (index: number) => {
    setEditingRowIndex(index);
  };

  const handleSaveEditRow = (index: number) => {
    const updatedPaymentTerms = [...(data.GEN_PAYMENT_TERMS_LIST || [])];
    setData((prev: any) => ({
      ...prev,
      GEN_PAYMENT_TERMS_LIST: updatedPaymentTerms,
    }));
    setEditingRowIndex(null);
  };

  const handleCancelEditRow = () => {
    setEditingRowIndex(null);
  };

  const handleDeleteRow = (index: number) => {
    const updatedPaymentTerms = (data.GEN_PAYMENT_TERMS_LIST || []).filter(
      (_: any, i: number) => i !== index
    );
    setData((prev: any) => ({
      ...prev,
      GEN_PAYMENT_TERMS_LIST: updatedPaymentTerms,
    }));
  };

  const handleUpdatePaymentTerm = (
    index: number,
    field: string,
    value: any
  ) => {
    const updatedPaymentTerms = [...(data.GEN_PAYMENT_TERMS_LIST || [])];
    updatedPaymentTerms[index] = {
      ...updatedPaymentTerms[index],
      [field]: field === "days" ? parseInt(value) || 0 : value,
    };
    setData((prev: any) => ({
      ...prev,
      GEN_PAYMENT_TERMS_LIST: updatedPaymentTerms,
    }));
  };

  const getEmbeddingFormatExample = (
    format: string,
    NUM_PREFIX: string,
    NUM_SUFFIX_VALUE: string,
    NUM_SEPARATOR: string
  ) => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    let yearPart = "";

    switch (format) {
      case "YY-YY":
        yearPart = `${currentYear.toString().slice(-2)}${"-"}${nextYear
          .toString()
          .slice(-2)}`;
        break;
      case "YYYY-YY":
        yearPart = `${currentYear}${"-"}${nextYear.toString().slice(-2)}`;
        break;
      case "YYYY":
        yearPart = currentYear.toString();
        break;
      default:
        yearPart = "";
    }

    let example = "";
    if (data.NUM_EMBED_YEAR_POSITION === "AS_PREFIX") {
      example = `${yearPart}${
        yearPart ? "-" : ""
      }${NUM_PREFIX}001${NUM_SUFFIX_VALUE}`;
    } else if (data.NUM_EMBED_YEAR_POSITION === "AS_SUFFIX") {
      example = `${NUM_PREFIX}001${NUM_SUFFIX_VALUE}${
        yearPart ? "-" : ""
      }${yearPart}`;
    } else {
      example = `${NUM_PREFIX}001${NUM_SUFFIX_VALUE}`;
    }

    return example;
  };

  const getCompleteInvoiceNumberExample = () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    let yearPart = "";

    // Generate year part based on embedding format
    if (data.NUM_EMBED_YEAR_POSITION !== "NOT_REQUIRED") {
      switch (data.NUM_YEAR_EMBEDDING_FORMAT) {
        case "YY-YY":
          yearPart = `${currentYear.toString().slice(-2)}${"-"}${nextYear
            .toString()
            .slice(-2)}`;
          break;
        case "YYYY-YY":
          yearPart = `${currentYear}${"-"}${nextYear.toString().slice(-2)}`;
          break;
        case "YYYY":
          yearPart = currentYear.toString();
          break;
        default:
          yearPart = "";
      }
    }

    // Generate sequence number with proper padding
    const minLength = parseInt(data.NUM_MIN_SEQUENCE_LENGTH) || 1;
    const sequenceNumber = (data.NUM_STARTING_VALUE || 1)
      .toString()
      .padStart(minLength, "0");

    // Combine all parts based on year position
    let invoiceNumber = "";
    const prefix = data.NUM_PREFIX || "";
    const suffix = data.NUM_SUFFIX_VALUE || "";
    const separator = data.NUM_SEPARATOR || "";

    if (data.NUM_EMBED_YEAR_POSITION === "AS_PREFIX" && yearPart) {
      invoiceNumber = `${prefix}${separator}${yearPart}${separator}${sequenceNumber}${separator}${suffix}`;
    } else if (data.NUM_EMBED_YEAR_POSITION === "AS_SUFFIX" && yearPart) {
      invoiceNumber = `${prefix}${separator}${sequenceNumber}${separator}${yearPart}${separator}${suffix}`;
    } else {
      invoiceNumber = `${prefix}${separator}${sequenceNumber}${separator}${suffix}`;
    }

    return invoiceNumber;
  };

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Grid container spacing={2}>
        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: "0px" }}>
            General Settings
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            value={data.GEN_DOCUMENT_LABEL}
            onChange={(e) => handleChange("GEN_DOCUMENT_LABEL", e.target.value)}
            fullWidth
            size="small"
            label="Document Label"
            sx={{ mb: "0px" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            value={data.GEN_BUSINESS_SLOGAN}
            onChange={(e) =>
              handleChange("GEN_BUSINESS_SLOGAN", e.target.value)
            }
            fullWidth
            size="small"
            label="Business Slogan"
            sx={{ mb: "0px" }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Rounding Method</InputLabel>
            <Select
              value={data.GEN_ROUNDING_METHOD}
              onChange={(e) =>
                handleChange("GEN_ROUNDING_METHOD", e.target.value)
              }
              label="Rounding Method"
              size="small"
              fullWidth
            >
              <MenuItem value="NORMAL">Normal Rounding (nearest)</MenuItem>
              <MenuItem value="ROUND_UP">Round Up</MenuItem>
              <MenuItem value="ROUND_DOWN">Round Down</MenuItem>
              <MenuItem value="NONE">No Rounding</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FormControlLabel
              label="Allow Backdated Invoice Generation"
              control={
                <Checkbox
                  checked={data.GEN_ALLOW_BACKDATED_INVOICE}
                  onChange={(e) =>
                    setData((prev: any) => ({
                      ...prev,
                      GEN_ALLOW_BACKDATED_INVOICE: e.target.checked,
                    }))
                  }
                  color="primary"
                />
              }
            />
            <Tooltip
              title={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Purpose
                  </Typography>
                  <Typography variant="body2">
                    Provides flexibility for invoice creation dates, allowing
                    you to create invoices with past dates when needed.
                  </Typography>
                </Box>
              }
              arrow
            >
              <InfoIcon
                fontSize="small"
                color="primary"
                sx={{ cursor: "help" }}
              />
            </Tooltip>
          </Box>
        </Grid>
        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: "0px" }}>
            Invoice Numbering
          </Typography>
        </Grid>
        {/* Numbering Type */}
        <Grid size={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Numbering Type</FormLabel>
            <RadioGroup
              value={data.NUM_TYPE}
              onChange={(e) => handleChange("NUM_TYPE", e.target.value)}
              row
            >
              <FormControlLabel
                value="AUTOMATIC"
                control={<Radio />}
                label="Automatic"
              />
              <FormControlLabel
                value="MANUAL"
                control={<Radio />}
                label="Manual"
              />
            </RadioGroup>
          </FormControl>
        </Grid>

        {data.NUM_TYPE === "AUTOMATIC" && (
          <>
            {/* Renumbering Frequency */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ mb: 1 }}>Renumbering Frequency</InputLabel>
                <Select
                  value={data.NUM_RENUMBER_FREQUENCY}
                  onChange={(e) =>
                    handleChange("NUM_RENUMBER_FREQUENCY", e.target.value)
                  }
                  label="Renumbering Frequency"
                >
                  <MenuItem value="YEARLY">Yearly</MenuItem>
                  <MenuItem value="NEVER_RESET">Never Reset</MenuItem>
                </Select>
                <FormHelperText>
                  Yearly is most common for financial years in India (e.g.,
                  FY24-25).
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Starting Number */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Starting Number"
                value={data.NUM_STARTING_VALUE}
                onChange={(e) =>
                  handleChange(
                    "NUM_STARTING_VALUE",
                    parseInt(e.target.value) || 1
                  )
                }
                size="small"
                fullWidth
                type="number"
                placeholder="e.g., 101, 0001"
                sx={{ mb: "0px" }}
              />
            </Grid>

            {/* Embed Year */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Embed Year</InputLabel>
                <Select
                  value={data.NUM_EMBED_YEAR_POSITION}
                  onChange={(e) =>
                    handleChange("NUM_EMBED_YEAR_POSITION", e.target.value)
                  }
                  label="Embed Year"
                >
                  <MenuItem value="NOT_REQUIRED">Not Required</MenuItem>
                  <MenuItem value="AS_PREFIX">As Prefix</MenuItem>
                  <MenuItem value="AS_SUFFIX">As Suffix</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Separator */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                label="Separator"
                value={data.NUM_SEPARATOR}
                onChange={(e) => handleChange("NUM_SEPARATOR", e.target.value)}
                size="small"
                fullWidth
                helperText="e.g., /, -, _"
                sx={{ mb: "0px" }}
              />
            </Grid>

            {/* Embedding Format */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Embedding Format</InputLabel>
                <Select
                  value={data.NUM_YEAR_EMBEDDING_FORMAT}
                  onChange={(e) =>
                    handleChange("NUM_YEAR_EMBEDDING_FORMAT", e.target.value)
                  }
                  size="small"
                  label="Embedding Format"
                  disabled={data.NUM_EMBED_YEAR_POSITION === "NOT_REQUIRED"}
                >
                  <MenuItem value="YY-YY">YY-YY</MenuItem>
                  <MenuItem value="YYYY-YY">YYYY-YY</MenuItem>
                  <MenuItem value="YYYY">YYYY</MenuItem>
                </Select>
                {/* {data.NUM_YEAR_EMBEDDING_FORMAT &&
                  data.NUM_EMBED_YEAR_POSITION !== "NOT_REQUIRED" && (
                    <FormHelperText>
                      Example:{" "}
                      {getEmbeddingFormatExample(
                        data.NUM_YEAR_EMBEDDING_FORMAT,
                        data.NUM_PREFIX,
                        data.NUM_SUFFIX_VALUE,
                        data.NUM_SEPARATOR
                      )}
                    </FormHelperText>
                  )} */}
              </FormControl>
            </Grid>

            {/* Prefix */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Prefix"
                value={data.NUM_PREFIX}
                onChange={(e) => handleChange("NUM_PREFIX", e.target.value)}
                size="small"
                fullWidth
                placeholder='e.g., "INV-", "TAX-"'
                helperText="This prefix is independent of the year if year is used as prefix/suffix."
                sx={{ mb: "0px" }}
              />
            </Grid>

            {/* Suffix */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Suffix"
                value={data.NUM_SUFFIX_VALUE}
                onChange={(e) =>
                  handleChange("NUM_SUFFIX_VALUE", e.target.value)
                }
                size="small"
                fullWidth
                helperText="This suffix is independent of the year if year is used as prefix/suffix."
                sx={{ mb: "0px" }}
              />
            </Grid>
            {/* Min Sequence Length */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Min Sequence Length"
                value={data.NUM_MIN_SEQUENCE_LENGTH}
                onChange={(e) =>
                  handleChange("NUM_MIN_SEQUENCE_LENGTH", e.target.value)
                }
                size="small"
                fullWidth
                helperText="This is the minimum length of the sequence number."
                sx={{ mb: "0px" }}
              />
            </Grid>

            {/* Example Number Preview */}
            <Grid size={12}>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  border: "1px solid",
                  borderColor: "primary.main",
                  borderRadius: 1,
                  backgroundColor: "primary.50",
                }}
              >
                <Typography variant="h6" sx={{ mb: 1, color: "primary.main" }}>
                  Example Number Preview
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    color: "primary.dark",
                    letterSpacing: 1,
                  }}
                >
                  {getCompleteInvoiceNumberExample()}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mt: 1, color: "text.secondary" }}
                >
                  This is how your invoice numbers will appear based on current
                  settings
                </Typography>
              </Box>
            </Grid>
          </>
        )}

        <Grid
          size={12}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6" sx={{ mb: "0px" }}>
            Payment Terms
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddNewRow}
          >
            Payment Term
          </Button>
        </Grid>

        <Grid size={12}>
          {(!data.GEN_PAYMENT_TERMS_LIST ||
            data.GEN_PAYMENT_TERMS_LIST.length === 0) &&
          !isAddingNew ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontStyle: "italic",
                textAlign: "center",
                py: 2,
                backgroundColor: "#f9f9f9",
                borderRadius: 1,
                border: "1px dashed #ddd",
              }}
            >
              There are no payment terms added!
            </Typography>
          ) : (
            <Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#F5F5F5" }}>
                      <TableCell>Label</TableCell>
                      <TableCell>No. of Days</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Existing payment terms */}
                    {(data.GEN_PAYMENT_TERMS_LIST || []).map(
                      (term: any, index: number) => (
                        <TableRow key={term.id || index}>
                          <TableCell>
                            {editingRowIndex === index ? (
                              <TextField
                                value={term.label}
                                onChange={(e) =>
                                  handleUpdatePaymentTerm(
                                    index,
                                    "label",
                                    e.target.value
                                  )
                                }
                                size="small"
                                fullWidth
                              />
                            ) : (
                              term.label
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRowIndex === index ? (
                              <TextField
                                value={term.days}
                                onChange={(e) =>
                                  handleUpdatePaymentTerm(
                                    index,
                                    "days",
                                    e.target.value
                                  )
                                }
                                size="small"
                                type="number"
                                fullWidth
                              />
                            ) : (
                              term.days
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRowIndex === index ? (
                              <>
                                <IconButton
                                  size="small"
                                  onClick={() => handleSaveEditRow(index)}
                                  color="primary"
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={handleCancelEditRow}
                                  color="secondary"
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditRow(index)}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteRow(index)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    )}

                    {/* New row being added */}
                    {isAddingNew && (
                      <TableRow>
                        <TableCell>
                          <TextField
                            value={newRowData.label}
                            onChange={(e) =>
                              setNewRowData({
                                ...newRowData,
                                label: e.target.value,
                              })
                            }
                            size="small"
                            fullWidth
                            placeholder="Enter label"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={newRowData.days}
                            onChange={(e) =>
                              setNewRowData({
                                ...newRowData,
                                days: e.target.value,
                              })
                            }
                            size="small"
                            type="number"
                            fullWidth
                            placeholder="Enter days"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={handleSaveNewRow}
                            color="primary"
                            disabled={
                              !newRowData.label.trim() ||
                              !newRowData.days.trim()
                            }
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleCancelNewRow}
                            color="secondary"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Grid>

        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: "0px" }}>
            Additional Information
          </Typography>
        </Grid>
        <Grid size={12}>
          {/* Terms & Conditions */}
          {!isEditingTerms &&
          (!data?.GEN_TERMS_AND_CONDITIONS ||
            data.GEN_TERMS_AND_CONDITIONS.trim() === "") ? (
            <Typography
              variant="body2"
              color="primary"
              sx={{
                cursor: "pointer",
                mb: "0px",
              }}
              onClick={() => setIsEditingTerms(true)}
            >
              +{" "}
              <span style={{ textDecoration: "underline" }}>
                Add Terms & Conditions
              </span>
            </Typography>
          ) : (
            <TextField
              label="Terms & Conditions"
              value={data?.GEN_TERMS_AND_CONDITIONS || ""}
              onChange={(e) =>
                setData({ ...data, GEN_TERMS_AND_CONDITIONS: e.target.value })
              }
              onBlur={() => {
                if (
                  !data?.GEN_TERMS_AND_CONDITIONS ||
                  data.GEN_TERMS_AND_CONDITIONS.trim() === ""
                ) {
                  setIsEditingTerms(false);
                }
              }}
              variant="outlined"
              fullWidth
              multiline
              rows={4}
              placeholder="Enter payment terms, warranty information, return policy, or any other terms and conditions for this invoice..."
              autoFocus
              sx={{ mb: "0px" }}
            />
          )}
        </Grid>
        <Grid size={12}>
          {/* Thank You Message */}
          {!isEditingThankYou &&
          (!data?.GEN_THANK_YOU_MESSAGE ||
            data.GEN_THANK_YOU_MESSAGE.trim() === "") ? (
            <Typography
              variant="body2"
              color="primary"
              sx={{
                cursor: "pointer",
                mb: "0px",
              }}
              onClick={() => setIsEditingThankYou(true)}
            >
              +{" "}
              <span style={{ textDecoration: "underline" }}>
                Add Thank You Message
              </span>
            </Typography>
          ) : (
            <TextField
              label="Thank You Message"
              value={data?.GEN_THANK_YOU_MESSAGE || ""}
              onChange={(e) =>
                setData({ ...data, GEN_THANK_YOU_MESSAGE: e.target.value })
              }
              onBlur={() => {
                if (
                  !data?.GEN_THANK_YOU_MESSAGE ||
                  data.GEN_THANK_YOU_MESSAGE.trim() === ""
                ) {
                  setIsEditingThankYou(false);
                }
              }}
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              placeholder="Enter a thank you message or closing remarks for your customers..."
              autoFocus
              sx={{ mb: "0px" }}
            />
          )}
        </Grid>
        <Grid size={12}>
          {/* Customer Notes */}
          {!isEditingCustomerNotes &&
          (!data?.GEN_NOTES || data.GEN_NOTES.trim() === "") ? (
            <Typography
              variant="body2"
              color="primary"
              sx={{
                cursor: "pointer",
                mb: "0px",
              }}
              onClick={() => setIsEditingCustomerNotes(true)}
            >
              + <span style={{ textDecoration: "underline" }}>Add Notes</span>
            </Typography>
          ) : (
            <TextField
              label="Notes"
              value={data?.GEN_NOTES || ""}
              onChange={(e) => setData({ ...data, GEN_NOTES: e.target.value })}
              onBlur={() => {
                if (!data?.GEN_NOTES || data.GEN_NOTES.trim() === "") {
                  setIsEditingCustomerNotes(false);
                }
              }}
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              placeholder="Enter any special notes or instructions for your customers..."
              autoFocus
              sx={{ mb: "0px" }}
            />
          )}
        </Grid>
        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: "0px" }}>
            Signature & Authentication
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {/* Signature Display Type Dropdown */}
          <FormControl fullWidth>
            <InputLabel id="signature-display-type-label">
              Signature Display Type
            </InputLabel>
            <Select
              labelId="signature-display-type-label"
              id="signature-display-type"
              value={data.SIG_DISPLAY_TYPE || "NONE"}
              label="Signature Display Type"
              onChange={(e) => {
                setData((prev: any) => ({
                  ...prev,
                  SIG_DISPLAY_TYPE: e.target.value,
                  // Reset other signature fields when changing type
                  SIG_IMAGE_DATA:
                    e.target.value !== "IMAGE_UPLOAD"
                      ? ""
                      : prev.SIG_IMAGE_DATA,
                  SIG_PRE_AUTH_LABEL_TEXT:
                    e.target.value !== "PRE-AUTHENTICATED_LABEL"
                      ? ""
                      : prev.SIG_PRE_AUTH_LABEL_TEXT,
                }));
                setSignatureImage("");
              }}
            >
              <MenuItem value="NONE">None</MenuItem>
              <MenuItem value="IMAGE_UPLOAD">Image Upload</MenuItem>
              <MenuItem value="PRE-AUTHENTICATED_LABEL">
                Pre-Authenticated Label
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Image Upload Section */}
        {data.SIG_DISPLAY_TYPE === "IMAGE_UPLOAD" && (
          <Grid size={12}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <UploadIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography
                  component="label"
                  sx={{
                    color: "primary.main",
                    textDecoration: "underline",
                    cursor: "pointer",
                    "&:hover": {
                      color: "primary.dark",
                    },
                    fontSize: "0.875rem",
                  }}
                >
                  Upload Signature Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Check file size (2MB = 2 * 1024 * 1024 bytes)
                        if (file.size > 2 * 1024 * 1024) {
                          setUploadError("File size must be less than 2MB");
                          return;
                        }

                        // Check file type
                        if (!file.type.startsWith("image/")) {
                          setUploadError("Please select a valid image file");
                          return;
                        }

                        setUploadError(null);

                        // Create preview and convert to base64
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64Data = event.target?.result as string;
                          setSignatureImage(base64Data);
                          setData((prev: any) => ({
                            ...prev,
                            SIG_IMAGE_DATA: base64Data,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </Typography>
              </Box>

              {uploadError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {uploadError}
                </Alert>
              )}

              {(signatureImage || data.SIG_IMAGE_DATA) && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Signature Preview:
                  </Typography>
                  <Box
                    sx={{
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      p: 1,
                      display: "inline-block",
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <img
                      src={signatureImage || data.SIG_IMAGE_DATA}
                      alt="Signature preview"
                      style={{
                        maxWidth: "200px",
                        maxHeight: "100px",
                        objectFit: "contain",
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        )}

        {/* Pre-Authenticated Label Section */}
        {data.SIG_DISPLAY_TYPE === "PRE-AUTHENTICATED_LABEL" && (
          <Grid size={12}>
            <TextField
              label="Pre-Authenticated Label Text"
              value={data.SIG_PRE_AUTH_LABEL_TEXT || ""}
              onChange={(e) =>
                setData((prev: any) => ({
                  ...prev,
                  SIG_PRE_AUTH_LABEL_TEXT: e.target.value,
                }))
              }
              variant="outlined"
              fullWidth
              placeholder="Enter the pre-authenticated label text..."
              size="small"
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default GeneralSettings;
