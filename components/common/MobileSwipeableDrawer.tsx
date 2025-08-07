"use client";

import React, { ReactNode } from "react";
import { 
  SwipeableDrawer, 
  Box, 
  Typography,
  styled,
  useTheme 
} from "@mui/material";
import { grey } from "@mui/material/colors";

interface MobileSwipeableDrawerProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Puller = styled("div")(({ theme }) => ({
  width: 30,
  height: 6,
  backgroundColor: grey[300],
  borderRadius: 3,
  position: "absolute",
  top: 8,
  left: "calc(50% - 15px)",
  ...theme.applyStyles?.("dark", {
    backgroundColor: grey[900],
  }),
}));

const DrawerContent = styled(Box)(({ theme }) => ({
  position: "relative",
  borderTopLeftRadius: 8,
  borderTopRightRadius: 8,
  visibility: "visible",
  right: 0,
  left: 0,
}));

export function MobileSwipeableDrawer({ 
  open, 
  onOpen, 
  onClose, 
  title,
  children 
}: MobileSwipeableDrawerProps) {
  const theme = useTheme();

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      disableSwipeToOpen={false}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        sx: {
          height: "auto",
          maxHeight: "85vh",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        },
      }}
    >
      <DrawerContent
        sx={{
          backgroundColor: theme.palette.background.paper,
          px: 2,
          pb: 1,
          height: "auto",
          overflow: "auto",
        }}
      >
        <Puller onClick={onClose}/>
        <Box sx={{ pt: 4 }}>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        </Box>
        {children}
      </DrawerContent>
    </SwipeableDrawer>
  );
}
