"use client";

import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, Tabs, Tab, Button } from "@mui/material";
import { HowItWorksDialog } from "../../../../components/ServiceManagement/configuration/HowItWorks";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ProcessList, {
  ProcessListHandle,
} from "../../../../components/ServiceManagement/processes/ProcessList";
import ProcessGroupList, {
  ProcessGroupListHandle,
} from "../../../../components/ServiceManagement/process-groups/ProcessGroupList";
import SOPList, { SOPListHandle } from "../../../../components/ServiceManagement/sop/SOPList";
import FunctionList, {
  FunctionListHandle,
} from "../../../../components/ServiceManagement/functions/FunctionList";
import ServiceCategoryList, {
  ServiceCategoryListHandle,
} from "../../../../components/ServiceManagement/service-category/ServiceCategoryList";
import ServiceSubcategoryList, {
  ServiceSubcategoryListHandle,
} from "../../../../components/ServiceManagement/service-subcategory/ServiceSubcategoryList";
import ServiceUserTypeList, {
  ServiceUserTypeListHandle,
} from "../../../../components/ServiceManagement/service-user-types/ServiceUserTypeList";

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
      id={`configurations-tabpanel-${index}`}
      aria-labelledby={`configurations-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `configurations-tab-${index}`,
    "aria-controls": `configurations-tabpanel-${index}`,
  };
}

export default function ConfigurationsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const theme = useTheme();

  const tabLabels = [
    "Process Groups",
    "Processes",
    "SOP",
    "Functions",
    "Service Category",
    "Service Subcategory",
    "Service User Types",
  ];

  // Refs for component functions
  const processListRef = useRef<ProcessListHandle>(null);
  const processGroupListRef = useRef<ProcessGroupListHandle>(null);
  const sopListRef = useRef<SOPListHandle>(null);
  const functionListRef = useRef<FunctionListHandle>(null);
  const serviceCategoryListRef = useRef<ServiceCategoryListHandle>(null);
  const serviceSubcategoryListRef = useRef<ServiceSubcategoryListHandle>(null);
  const serviceUserTypeListRef = useRef<ServiceUserTypeListHandle>(null);

  useEffect(() => {
    document.title = `Configuration | ${tabLabels[tabValue] || ""}`;
  }, [tabValue, tabLabels]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          alignItems: "center",
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Configuration
        </Typography>
        <Button
          onClick={() => setHowItWorksOpen(true)}
          variant="outlined"
          color="primary"
          sx={{ ml: "auto", mr: 2 }}
        >
          How it works
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            // Handle the add new item based on the current tab
            switch (tabValue) {
              case 0: // Process Groups
                if (processGroupListRef.current) {
                  processGroupListRef.current.openAddDrawer();
                }
                break;
              case 1: // Processes
                if (processListRef.current) {
                  processListRef.current.openAddDrawer();
                }
                break;
              case 2: // SOP
                if (sopListRef.current) {
                  sopListRef.current.openAddDrawer();
                }
                break;
              case 3: // Functions
                if (functionListRef.current) {
                  functionListRef.current.openAddDrawer();
                }
                break;
              case 4: // Service Category
                if (serviceCategoryListRef.current) {
                  serviceCategoryListRef.current.openAddDrawer();
                }
                break;
              case 5: // Service Subcategory
                if (serviceSubcategoryListRef.current) {
                  serviceSubcategoryListRef.current.openAddDrawer();
                }
                break;
              case 6: // Service User Types
                if (serviceUserTypeListRef.current) {
                  serviceUserTypeListRef.current?.openAddDrawer();
                }
                break;
            }
          }}
        >
          {tabValue === 0
            ? "New Process Group"
            : tabValue === 1
            ? "New Process"
            : tabValue === 2
            ? "New SOP"
            : tabValue === 3
            ? "New Function"
            : tabValue === 4
            ? "New Service Category"
            : tabValue === 5
            ? "New Service Subcategory"
            : tabValue === 6
            ? "New Service User Type"
            : "New Service User Type"}
        </Button>
      </Box>

      {/* How it works dialog */}
      <HowItWorksDialog
        open={howItWorksOpen}
        handleClose={() => setHowItWorksOpen(false)}
        theme={theme}
      />

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="configurations tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>

      {/* Processes Tab */}
      <TabPanel value={tabValue} index={0}>
        <ProcessGroupList ref={processGroupListRef} />
      </TabPanel>

      {/* Processes Tab */}
      <TabPanel value={tabValue} index={1}>
        <ProcessList ref={processListRef} />
      </TabPanel>

      {/* SOP Tab */}
      <TabPanel value={tabValue} index={2}>
        <SOPList ref={sopListRef} />
      </TabPanel>

      {/* Functions Tab */}
      <TabPanel value={tabValue} index={3}>
        <FunctionList ref={functionListRef} />
      </TabPanel>

      {/* Service Category Tab */}
      <TabPanel value={tabValue} index={4}>
        <ServiceCategoryList ref={serviceCategoryListRef} />
      </TabPanel>

      {/* Service Subcategory Tab */}
      <TabPanel value={tabValue} index={5}>
        <ServiceSubcategoryList ref={serviceSubcategoryListRef} />
      </TabPanel>

      {/* Service User Types Tab */}
      <TabPanel value={tabValue} index={6}>
        <ServiceUserTypeList ref={serviceUserTypeListRef} />
      </TabPanel>
    </Box>
  );
}
