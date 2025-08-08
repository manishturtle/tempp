"use client";

import React, { useState } from "react";
import { Box, Typography, Tabs, Tab, Paper, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { CheckoutConfigsCardList } from "@/app/components/admin/configuration/CheckoutConfigsCardList";
import { UITemplateSettingsCardList } from "@/app/components/admin/configuration/UITemplateSettingsCardList";
import { FeatureToggleSettingsCardList } from "@/app/components/admin/configuration/FeatureToggleSettingsCardList";
import GuestConfig from "@/app/components/admin/configuration/GuestConfig";

/**
 * TabPanel component to display content for the active tab
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`configuration-tabpanel-${index}`}
      aria-labelledby={`configuration-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export default function ConfigurationPage(): React.ReactElement {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ): void => {
    setActiveTab(newValue);
  };

  return (
    <>
      <Typography variant="h4" component="h1">
        {t("configuration.pageTitle", "Store Configuration")}
      </Typography>

      <Paper elevation={2} sx={{ overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="Configuration tabs"
          >
            <Tab
              label={t(
                "configuration.tabs.generalFeatures",
                "General & Features"
              )}
            />
            <Tab label={t("configuration.tabs.uiTemplates", "UI Templates")} />
            <Tab label={t("configuration.tabs.checkout", "Checkout")} />
            <Tab label={t("configuration.tabs.guest", "Guest")} />
          </Tabs>
        </Box>
      </Paper>

      {/* Tab content panels */}
      <TabPanel value={activeTab} index={0}>
        <FeatureToggleSettingsCardList />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <UITemplateSettingsCardList />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <CheckoutConfigsCardList />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <GuestConfig />
      </TabPanel>
    </>
  );
}
