"use client";

import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, Tabs, Tab, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ServiceUserList, {
  ServiceUserListHandle,
} from "../../../../components/ServiceManagement/service-users/ServiceUserList";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-management-tabpanel-${index}`}
      aria-labelledby={`user-management-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `user-management-tab-${index}`,
    "aria-controls": `user-management-tabpanel-${index}`,
  };
}

export default function UserManagementPage() {
  const [tabValue, setTabValue] = useState(0);

  const tabLabels = ["Service Users"];

  // Refs for component functions
  const serviceUserListRef = useRef<ServiceUserListHandle>(null);

  useEffect(() => {
    document.title = "User Management";
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            // Handle the add new item based on the current tab
            switch (tabValue) {
              case 0: // Service Users
                if (serviceUserListRef.current) {
                  serviceUserListRef.current.openAddDrawer();
                }
                break;
            }
          }}
        >
          Add New Service User
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="user management tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ServiceUserList ref={serviceUserListRef} />
      </TabPanel>
    </Box>
  );
}
