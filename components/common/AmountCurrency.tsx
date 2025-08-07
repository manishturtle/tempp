import React, { useState, useMemo } from "react";
import {
  InputBase,
  Box,
  Typography,
  Menu,
  MenuItem,
  ListSubheader,
  TextField,
  InputAdornment,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  "label + &": {
    marginTop: theme.spacing(3),
  },
  "& .MuiInputBase-input": {
    borderRadius: 8,
    position: "relative",
    backgroundColor: theme.palette.mode === "light" ? "#ffffff" : "#2b2b2b",
    border: "1px solid #ced4da",
    fontSize: 16,
    width: "100%",
    padding: "10px 12px",
    // Adjust padding to make space for the end adornment
    paddingRight: "100px",
    transition: theme.transitions.create([
      "border-color",
      "background-color",
      "box-shadow",
    ]),
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    "&:focus": {
      boxShadow: `rgba(6, 24, 44, 0.4) 0px 0px 0px 2px, rgba(6, 24, 44, 0.65) 0px 4px 6px -1px, rgba(255, 255, 255, 0.08) 0px 1px 0px inset`,
      borderColor: "#80bdff",
    },
  },
}));

export const CurrencyInput = ({
  label,
  amount,
  onAmountChange,
  selectedCurrency,
  onCurrencyChange,
  currencyData,
}: {
  label: string;
  amount: string;
  onAmountChange: (amount: string) => void;
  selectedCurrency: { code: string; name: string };
  onCurrencyChange: (currency: { code: string; name: string }) => void;
  currencyData: { code: string; name: string }[];
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const open = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    // Reset search term when closing
    setSearchTerm("");
  };

  const handleCurrencySelect = (currency: { code: string; name: string }) => {
    onCurrencyChange(currency); // Use the prop handler
    handleCloseMenu();
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and a single decimal point
    const value = event.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      onAmountChange(value); // Use the prop handler
    }
  };

  // Filter currencies based on the search term using the prop data
  const filteredCurrencies = useMemo(() => {
    if (!searchTerm) {
      return currencyData;
    }
    return currencyData.filter(
      (currency) =>
        currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, currencyData]);

  return (
    <Box sx={{ width: "100%", maxWidth: 400 }}>
      {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography> */}
      <StyledInputBase
        fullWidth
        value={amount}
        onChange={handleAmountChange}
        endAdornment={
          <Box
            onClick={handleOpenMenu}
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              padding: "0 12px",
              borderLeft: "1px solid #ced4da",
              height: "100%",
              position: "absolute",
              right: 0,
              top: 0,
              backgroundColor: "#f8f9fa",
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
            }}
          >
            <Typography variant="subtitle1" sx={{ mr: 0.5 }}>
              {selectedCurrency?.code}
            </Typography>
            <KeyboardArrowDownIcon fontSize="small" />
          </Box>
        }
      />
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        PaperProps={{
          style: {
            maxHeight: 300,
            width: "300px",
            marginTop: "8px",
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgb(0 0 0 / 0.1)",
          },
        }}
      >
        <ListSubheader>
          <TextField
            fullWidth
            placeholder="Type currency or country"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()} // Prevents menu from closing on click
            onKeyDown={(e) => e.stopPropagation()} // Prevents menu from closing on keydown
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: { borderRadius: "6px" },
            }}
            sx={{ padding: "8px" }}
          />
        </ListSubheader>
        {filteredCurrencies.length > 0 ? (
          filteredCurrencies.map((currency) => (
            <MenuItem
              key={currency.code}
              onClick={() => handleCurrencySelect(currency)}
              selected={currency.code === selectedCurrency?.code}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Typography>{currency.name}</Typography>
                <Typography color="text.secondary">{currency.code}</Typography>
              </Box>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No currency found</MenuItem>
        )}
      </Menu>
    </Box>
  );
};
