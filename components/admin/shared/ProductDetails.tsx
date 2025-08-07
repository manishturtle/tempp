"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Product } from "@/app/types/store/product";
import ProductDialog from "./ProductDialog";
import { OrderMode } from "@/app/types/order";
export interface ProductLineItemTax {
  tax_id: number;
  tax_code: string;
  tax_rate: number;
  tax_amount: number;
}

export interface ProductLineItem {
  item_order: number;
  product_sku: string;
  product_name: string;
  product: number; // product id
  quantity: number;
  unit_price: number;
  description?: string;
  hsn_sac_code?: string;
  discount_type?: string;
  discount_percentage?: number;
  discount_amount: number;
  taxes: ProductLineItemTax[];
  total_price: number;
  uom_symbol?: string;
}

interface ProductDetailsProps {
  mode: string;
  orderData: any;
  setOrderData: React.Dispatch<React.SetStateAction<any>>;
  products: Product[];
  showNotification?: (
    message: string,
    severity?: "success" | "info" | "warning" | "error"
  ) => void;
  showWarning?: (message: string) => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  mode,
  orderData,
  setOrderData,
  products,
  showNotification,
  showWarning,
}) => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductLineItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  const handleAddProduct = (product: ProductLineItem) => {
    if (editMode && editingIndex >= 0) {
      // Handle edit mode
      const updatedItems = [...orderData.items];
      updatedItems[editingIndex] = product;
      setOrderData({ ...orderData, items: updatedItems });
    } else {
      console.log("Product added:", product);
      const updatedItems = [...orderData.items];
      updatedItems.push(product);
      setOrderData({ ...orderData, items: updatedItems });
    }
    handleCloseDialog();
  };

  const handleEditItem = (item: ProductLineItem, index: number) => {
    setEditMode(true);
    setEditingItem(item);
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setEditingItem(null);
    setEditingIndex(-1);
  };

  const handleOpenDialog = () => {
    if (products.length === 0) {
      if (showWarning) {
        showWarning("Please select a valid account and selling channel");
      } else if (showNotification) {
        showNotification(
          "Please select a valid account and selling channel",
          "warning"
        );
      } else {
        console.log("No products available");
      }
      return;
    }
    setDialogOpen(true);
  };

  const handleDeleteProduct = (index: number) => {
    const updatedItems = [...orderData.items];
    updatedItems.splice(index, 1);
    setOrderData({ ...orderData, items: updatedItems });
    handleCloseDialog();
  };

  const isReadOnly = mode.toLowerCase() === OrderMode.VIEW;

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
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">{t("orders.productDetails")}</Typography>
        {!isReadOnly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            {t("orders.addProduct")}
          </Button>
        )}
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("orders.srNo")}</TableCell>
              <TableCell>{t("orders.productName")}</TableCell>
              <TableCell align="right">{t("orders.qty")}</TableCell>
              <TableCell align="right">{t("orders.rate")}</TableCell>
              <TableCell align="right">{t("orders.discount")}</TableCell>
              <TableCell align="right">{t("orders.taxableValue")}</TableCell>
              <TableCell align="right">{t("orders.totalAmount")}</TableCell>
              {!isReadOnly && (
                <TableCell align="center">{t("orders.actions")}</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {orderData.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={!isReadOnly ? 8 : 9} align="center">
                  {t("orders.noProductsAdded")}
                </TableCell>
              </TableRow>
            ) : (
              orderData.items.map((item: ProductLineItem, index: number) => (
                <TableRow key={`${item.product}-${index}`}>
                  <TableCell>{item.item_order}</TableCell>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">
                    ₹ {item.unit_price?.toFixed(2)} /{item.uom_symbol}
                  </TableCell>
                  <TableCell align="right">
                    ₹ {item.discount_amount?.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    ₹{" "}
                    {(
                      item.quantity * item.unit_price -
                      item.discount_amount
                    ).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    ₹ {item.total_price?.toFixed(2)}
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell align="center">
                      <Box sx={{ display: "flex" }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditItem(item, index)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteProduct(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <ProductDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onAddProduct={handleAddProduct}
        products={products}
        lineItems={orderData.items}
        editMode={editMode}
        editingItem={editingItem}
      />
    </Box>
  );
};

export default ProductDetails;
