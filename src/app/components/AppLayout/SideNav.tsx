"use client";

import {
  useState,
  useMemo,
  useCallback,
  useTransition,
  useEffect,
} from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  styled,
  useTheme,
  Box,
  ListItemButton,
  TextField,
  InputAdornment,
  Tooltip,
  Divider,
  alpha,
  Typography,
  CircularProgress,
} from "@mui/material";
import {
  ContactsOutlined,
  BusinessCenterOutlined,
  AssignmentOutlined,
  PeopleOutlineOutlined,
  SettingsOutlined,
  AdminPanelSettingsOutlined,
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  Dashboard,
  CategoryOutlined,
  InventoryOutlined,
  ListAltOutlined,
  StraightenOutlined,
  CampaignOutlined,
  AnalyticsOutlined,
  VerifiedUserOutlined,
  Label,
  HelpOutline,
  Search,
  ConfirmationNumber,
  Settings,
  People,
  Style,
  AttachMoneyOutlined,
  StyleOutlined,
  LabelOutlined,
  GroupOutlined,
  StorefrontOutlined,
  PublicOutlined,
  PercentOutlined,
  ReceiptOutlined,
  ShoppingBasketOutlined,
  LocationOnOutlined,
  PaymentOutlined,
  LocalShippingOutlined,
  AccessTime as AccessTimeOutlined,
  AccountTree as AccountTreeIcon,
  Android as AndroidIcon,
  Article as ArticleIcon,
  Payments as PaymentsIcon,
} from "@mui/icons-material";
import { useRouter, usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/app/i18n/LanguageContext";
import { getTranslation } from "@/app/i18n/languageUtils";

const DRAWER_WIDTH = 260;

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  translationKey: string;
}

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  variant: "permanent" | "persistent" | "temporary";
  collapsedWidth: number;
  isRTL?: boolean;
}

export default function SideNav({
  isOpen,
  onClose,
  variant,
  collapsedWidth,
  isRTL = false,
}: SideNavProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  // Ensure tenant is always a valid string and never undefined
  const tenant = (params?.tenant as string) || '';
  const [crmOpen, setCrmOpen] = useState(true);
  const [mastersOpen, setMastersOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [storePickupOpen, setStorePickupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkoutSection] = useState(true);
  const { currentLanguage } = useLanguage();
  const [opportunitiesOpen, setOpportunitiesOpen] = useState(false);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const [tenantAdminOpen, setTenantAdminOpen] = useState(false);
  const [serviceManagementOpen, setServiceManagementOpen] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [aiPlatformOpen, setAiPlatformOpen] = useState(false);

  // Function to translate text
  const t = (key: string) => getTranslation(key, currentLanguage);


   const AI_Platform: NavItem[] = [
    {
      title: t("sidenav.items.webhooks"),
      path: `/${tenant}/Crm/ai-platform/webhook`,
      icon: <Dashboard />,
      translationKey: "webhooks",
    },
    {
      title: t("sidenav.items.workbench"),
      path: `/${tenant}/Crm/ai-platform/prompt-template/create`,
      icon: <Dashboard />,
      translationKey: "workbench",
    },
    {
      title: t("sidenav.items.promptTemplate"),
      path: `/${tenant}/Crm/ai-platform/prompt-template/list`,
      icon: <Dashboard />,
      translationKey: "promptTemplate",
    },
    {
      title: t("sidenav.items.roleManagement"),
      path: `/${tenant}/Crm/ai-platform/role-management`,
      icon: <Dashboard />,
      translationKey: "roleManagement",
    },
      
    {
      title: t("sidenav.items.userManagement"),
      path: `/${tenant}/Crm/ai-platform/user-management`,
      icon: <Dashboard />,
      translationKey: "userManagement",
    },
    {
      title: t("sidenav.items.apiKey"),
      path: `/${tenant}/Crm/ai-platform/api-key`,
      icon: <Dashboard />,
      translationKey: "apiKey",
    },
    {
      title: t("sidenav.items.apiCredits"),
      path: `/${tenant}/Crm/ai-platform/credits`,
      icon: <Dashboard />,
      translationKey: "apiCredits",
    },
      
  ]

  const TenantAdminItems: NavItem[] = [
    {
      title: t("sidenav.items.dashboard"),
      path: `/${tenant}/Crm/tenant-admin/tenant-dashboard`,
      icon: <ContactsOutlined />,
      translationKey: "dashboard",
    },
    {
      title: t("sidenav.items.usersManagement"),
      path: `/${tenant}/Crm/tenant-admin/users`,
      icon: <ContactsOutlined />,
      translationKey: "usersManagement",
    },
    {
      title: t("sidenav.items.invoicing"),
      path: `/${tenant}/Crm/tenant-admin/billing-invoicing`,
      icon: <ContactsOutlined />,
      translationKey: "invoicing",
    },
    {
      title: t("sidenav.items.subscriptions"),
      path: `/${tenant}/Crm/tenant-admin/tenant-subscriptions`,
      icon: <ContactsOutlined />,
      translationKey: "subscriptions",
    },

    {
      title: t("sidenav.items.geofences"),
      path: `/${tenant}/Crm/tenant-admin/geo-fenching`,
      icon: <ContactsOutlined />,
      translationKey: "geofencing",
    },
    

    {
      title: t("sidenav.items.sources"),
      path: `/${tenant}/Crm/tenant-admin/sources`,
      icon: <ContactsOutlined />,
      translationKey: "sources",
    },
    {
      title: t("sidenav.items.settings"),
      path: `/${tenant}/Crm/tenant-admin/setting-config`,
      icon: <ContactsOutlined />,
      translationKey: "settings",
    },
    {
      title: t("sidenav.items.paymentGateway"),
      path: `/${tenant}/Crm/tenant-admin/payment-gateway`,
      icon: <ContactsOutlined />,
      translationKey: "paymentGateway",
    },
    {
      title: t("sidenav.items.bankAccount"),
      path: `/${tenant}/Crm/tenant-admin/bank-accounts`,
      icon: <ContactsOutlined />,
      translationKey: "bankAccount",
    },

    {
      title: t("sidenav.items.configurations"),
      path: `/${tenant}/Crm/tenant-admin/settings`,
      icon: <ContactsOutlined />,
      translationKey: "configurations",
    },
   
  
  ];
  
  const ServiceManagementItems: NavItem[] = [
    {
      title: "Dashboard",
      path: `/${tenant}/Crm/service-management/dashboard`,
      icon: <Dashboard />,
      translationKey: "sidenav.items.dashboard",
    },
    {
      title: "Service Tickets",
      path: `/${tenant}/Crm/service-management/service-tickets`,
      icon: <ConfirmationNumber />,
      translationKey: "sidenav.items.serviceTickets",
    },
    {
      title: "Configuration",
      path: `/${tenant}/Crm/service-management/configuration`,
      icon: <Settings />,
      translationKey: "sidenav.items.configuration",
    },
    {
      title: "User Management",
      path: `/${tenant}/Crm/service-management/user-management`,
      icon: <People />,
      translationKey: "sidenav.items.userManagement",
    },
  ];

  const EngagementItems: NavItem[] = [
  
    { 
      title: 'Contacts', 
      path: `/${tenant}/Crm/engagement/contacts`, 
      icon: <ContactsOutlined />, 
      translationKey: 'contacts' 
    },
    { 
      title: 'Lists', 
      path: `/${tenant}/Crm/engagement/lists`, 
      icon: <ListAltOutlined />, 
      translationKey: 'lists' 
    },
    { 
      title: 'Campaigns', 
      path: `/${tenant}/Crm/engagement/campaigns`, 
      icon: <CampaignOutlined />, 
      translationKey: 'campaigns' 
    },
    { 
      title: 'Campaign Analytics', 
      path: `/${tenant}/Crm/engagement/campaigns/analytics`, 
      icon: <AnalyticsOutlined />, 
      translationKey: 'campaignAnalytics' 
    },
    { 
      title: 'Bulk Verify', 
      path: `/${tenant}/Crm/engagement/bulk-verify/status`, 
      icon: <VerifiedUserOutlined />, 
      translationKey: 'bulkVerify' 
    },
  ];

  const crmItems: NavItem[] = [
    {
      title: t("sidenav.items.dashboard"),
      path: `/${tenant}/Crm`,
      icon: <Dashboard />,
      translationKey: "dashboard",
    },
    // { title: t('sidenav.items.contacts'), path: `/${tenant}/Crm/Crm/contacts`, icon: <ContactsOutlined />, translationKey: 'contacts' },
  ];
  const paymentMethodsItems: NavItem[] = [
    {
      title: t("sidenav.items.paymentMethods"),
      path: `/${tenant}/Crm/admin/payment-methods`,
      icon: <PaymentOutlined />,
      translationKey: "paymentMethods",
    },
  ];
  const ordersItems: NavItem[] = [
    // Orders Management Items
    {
      title: t("sidenav.items.orders"),
      path: `/${tenant}/Crm/admin/orders`,
      icon: <ShoppingBasketOutlined />,
      translationKey: "orders",
    },
    {
      title: t("sidenav.items.invoices"),
      path: `/${tenant}/Crm/admin/invoices`,
      icon: <ReceiptOutlined />,
      translationKey: "invoices",
    },
    {
      title: t("sidenav.items.receipts"),
      path: `/${tenant}/Crm/admin/receipts`,
      icon: <PaymentsIcon />,
      translationKey: "receipts",
    },
  ];
  const customerItems: NavItem[] = [
    // Customer Management Items
    {
      title: t("sidenav.items.accounts"),
      path: `/${tenant}/Crm/Masters/customers/accounts`,
      icon: <BusinessCenterOutlined />,
      translationKey: "accounts",
    },
    {
      title: t("sidenav.items.contacts"),
      path: `/${tenant}/Crm/Masters/customers/contacts`,
      icon: <ContactsOutlined />,
      translationKey: "contacts",
    },
    {
      title: t("sidenav.items.customerGroups"),
      path: `/${tenant}/Crm/Masters/customers/customer-groups`,
      icon: <GroupOutlined />,
      translationKey: "customerGroups",
    },
  ];
  const inventoryItems: NavItem[] = [
    // Inventory Management
    {
      title: t("sidenav.items.inventory"),
      path: `/${tenant}/Crm/Masters/inventory`,
      icon: <InventoryOutlined />,
      translationKey: "inventory",
    },
    {
      title: t("sidenav.items.adjustmentHistory"),
      path: `/${tenant}/Crm/Masters/inventory/adjustment-history`,
      icon: <ReceiptOutlined />,
      translationKey: "inventoryAdjustmentHistory",
    },
    {
      title: t("sidenav.items.adjustmentReasons"),
      path: `/${tenant}/Crm/Masters/inventory/adjustment-reasons`,
      icon: <ListAltOutlined />,
      translationKey: "adjustmentReasons",
    },
    {
      title: t("sidenav.items.locations"),
      path: `/${tenant}/Crm/Masters/inventory/locations`,
      icon: <LocationOnOutlined />,
      translationKey: "locations",
    },
    {
      title: t("sidenav.items.serializedInventory"),
      path: `/${tenant}/Crm/Masters/inventory/serialized-inventory`,
      icon: <StyleOutlined />,
      translationKey: "serializedInventory",
    },
    {
      title: t("sidenav.items.lotInventory"),
      path: `/${tenant}/Crm/Masters/inventory/lots`,
      icon: <ListAltOutlined />,
      translationKey: "lotInventory",
    },
  ];
  const productItems: NavItem[] = [
    // Catalogue Management Items
    {
      title: t("sidenav.items.divisions"),
      path: `/${tenant}/Crm/Masters/catalogue/divisions`,
      icon: <CategoryOutlined />,
      translationKey: "divisions",
    },
    {
      title: t("sidenav.items.categories"),
      path: `/${tenant}/Crm/Masters/catalogue/categories`,
      icon: <ListAltOutlined />,
      translationKey: "categories",
    },
    {
      title: t("sidenav.items.subcategories"),
      path: `/${tenant}/Crm/Masters/catalogue/subcategories`,
      icon: <LabelOutlined />,
      translationKey: "subcategories",
    },
    {
      title: t("sidenav.items.products"),
      path: `/${tenant}/Crm/Masters/products`,
      icon: <ShoppingBasketOutlined />,
      translationKey: "products",
    },
    {
      title: t("sidenav.items.unitOfMeasurement"),
      path: `/${tenant}/Crm/Masters/catalogue/units-of-measure`,
      icon: <StraightenOutlined />,
      translationKey: "unitOfMeasures",
    },
    {
      title: t("sidenav.items.productStatuses"),
      path: `/${tenant}/Crm/Masters/catalogue/product-statuses`,
      icon: <StyleOutlined />,
      translationKey: "productStatuses",
    },
    // Attributes Management Items
    {
      title: t("sidenav.items.attributeGroups"),
      path: `/${tenant}/Crm/Masters/attributes/attribute-groups`,
      icon: <CategoryOutlined />,
      translationKey: "attributeGroups",
    },
    {
      title: t("sidenav.items.attributes"),
      path: `/${tenant}/Crm/Masters/attributes/attributes`,
      icon: <ListAltOutlined />,
      translationKey: "attributesList",
    },
  ];
  const pricingItems: NavItem[] = [
    // Pricing Management Items
    // { title: 'CustomerGroups', path: `/${tenant}/Crm/Masters/pricing/customer-groups`, icon: <GroupOutlined />, translationKey: 'customerGroups' },
    {
      title: t("sidenav.items.sellingChannels"),
      path: `/${tenant}/Crm/Masters/pricing/selling-channels`,
      icon: <StorefrontOutlined />,
      translationKey: "sellingChannels",
    },
    {
      title: t("sidenav.items.taxRates"),
      path: `/${tenant}/Crm/Masters/pricing/tax-rates`,
      icon: <PercentOutlined />,
      translationKey: "taxRates",
    },
    {
      title: t("sidenav.items.taxRateProfiles"),
      path: `/${tenant}/Crm/Masters/pricing/tax-rate-profiles`,
      icon: <ReceiptOutlined />,
      translationKey: "taxRateProfiles",
    },
  ];
  const checkoutItems: NavItem[] = [
    // Checkout Management
    {
      title: t("sidenav.items.storePickup"),
      path: `/${tenant}/Crm/admin/store-pickup`,
      icon: <StorefrontOutlined />,
      translationKey: "storePickup",
    },
    {
      title: t("sidenav.items.timeSlots"),
      path: `/${tenant}/Crm/admin/time-slots`,
      icon: <AccessTimeOutlined />,
      translationKey: "timeSlots",
    },
    {
      title: t("sidenav.items.shippingMethods"),
      path: `/${tenant}/Crm/admin/shipping-methods`,
      icon: <LocalShippingOutlined />,
      translationKey: "shippingMethods",
    },
    {
      title: t("sidenav.items.shippingZones"),
      path: `/${tenant}/Crm/admin/shipping-zones`,
      icon: <LocalShippingOutlined />,
      translationKey: "shippingZones",
    }
  ];

  const configurationItems: NavItem[] = [
    // Store Configuration
    // {
    //   title: t("sidenav.items.onboarding"),
    //   path: `/${tenant}/Crm/Masters/onboarding`,
    //   icon: <StorefrontOutlined />,
    //   translationKey: "onboarding",
    // },
    {
      title: t("sidenav.items.storeConfiguration"),
      path: `/${tenant}/Crm/Masters/store-configuration`,
      icon: <SettingsOutlined />,
      translationKey: "storeConfiguration",
    },
    {
      title: t("sidenav.items.configuration"),
      path: `/${tenant}/Crm/admin/configuration`,
      icon: <SettingsOutlined />,
      translationKey: "configuration",
    },
    {
      title: t("sidenav.items.pageManagement"),
      path: `/${tenant}/Crm/Masters/page-management`,
      icon: <ListAltOutlined />,
      translationKey: "pageManagement",
    },
  ];

  const mastersItems: NavItem[] = [
    // Global Settings Items
    {
      title: t("sidenav.items.countries"),
      path: `/${tenant}/Crm/Masters/countries`,
      icon: <PublicOutlined />,
      translationKey: "countries",
    },
    {
      title: t("sidenav.items.currencies"),
      path: `/${tenant}/Crm/Masters/currencies`,
      icon: <AttachMoneyOutlined />,
      translationKey: "currencies",
    },
  ];

  const opportunityItems: NavItem[] = [
    {
      title: t("sidenav.items.opportunities"),
      path: `/${tenant}/Crm/opportunities`,
      icon: <ShoppingBasketOutlined />,
      translationKey: "opportunities",
    },
    {
      title: t("sidenav.items.opportunityRoles"),
      path: `/${tenant}/Crm/opportunities/roles`,
      icon: <AndroidIcon />,
      translationKey: "opportunityRoles",
    },
    {
      title: t("sidenav.items.opportunityStatuses"),
      path: `/${tenant}/Crm/opportunities/statuses`,
      icon: <ArticleIcon />,
      translationKey: "opportunityStatuses",
    },
    {
      title: t("sidenav.items.opportunityTypes"),
      path: `/${tenant}/Crm/opportunities/types`,
      icon: <ArticleIcon />,
      translationKey: "opportunityTypes",
    },
    {
      title: t("sidenav.items.opportunityLeadSources"),
      path: `/${tenant}/Crm/opportunities/lead-sources`,
      icon: <ArticleIcon />,
      translationKey: "opportunityLeadSources",
    },

  ];
  // Track navigation state
  const [isPending, startTransition] = useTransition();
  const [activeNavPath, setActiveNavPath] = useState<string | null>(null);

  // Set initial active path based on current pathname when component mounts
  useEffect(() => {
    setActiveNavPath(pathname);
  }, [pathname]);

  // Check if a path is active (exact match or is a parent path)
  const isPathActive = useCallback(
    (path: string): boolean => {
      // Exact match
      if (pathname === path) return true;

      // Check if current path starts with the nav item path (for nested routes)
      // But ensure we're matching complete path segments
      if (path !== "/" && pathname.startsWith(path)) {
        // Make sure it's a complete segment match
        const nextChar = pathname.charAt(path.length);
        return nextChar === "/" || nextChar === "";
      }

      return false;
    },
    [pathname]
  );

  // Optimized navigation handler with immediate feedback
  const handleNavigation = useCallback(
    (path: string) => {
      // Only close drawer if it's temporary and on mobile
      if (variant === "temporary") {
        onClose();
      }

      // Set active navigation path for visual feedback
      setActiveNavPath(path);

      // Use startTransition to avoid blocking UI during navigation
      startTransition(() => {
        // Make sure path includes the tenant slug for proper routing
        // Use the complete path as is without modifications
        router.push(path, { scroll: false });
      });
    },
    [variant, onClose, router]
  );

  // Filter menu items based on search query - optimized dependencies
  const filteredCrmItems = useMemo(() => {
    if (!searchQuery) return crmItems;
    return crmItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, crmItems]);

  const filteredMastersItems = useMemo(() => {
    if (!searchQuery) return mastersItems;
    return mastersItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, mastersItems]);

  const filteredProductItems = useMemo(() => {
    if (!searchQuery) return productItems;
    return productItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, productItems]);

  const filteredPricingItems = useMemo(() => {
    if (!searchQuery) return pricingItems;
    return pricingItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, pricingItems]);

  const filteredConfigurationItems = useMemo(() => {
    if (!searchQuery) return configurationItems;
    return configurationItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, configurationItems]);

  const filteredInventoryItems = useMemo(() => {
    if (!searchQuery) return inventoryItems;
    return inventoryItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, inventoryItems]);

  const filteredCustomerItems = useMemo(() => {
    if (!searchQuery) return customerItems;
    return customerItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, customerItems]);

  const filteredOrdersItems = useMemo(() => {
    if (!searchQuery) return ordersItems;
    return ordersItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, ordersItems]);

  const filteredOpportunityItems = useMemo(() => {
    if (!searchQuery) return opportunityItems;
    return opportunityItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, opportunityItems]);

  const filteredPaymentMethodsItems = useMemo(() => {
    if (!searchQuery) return paymentMethodsItems;
    return paymentMethodsItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, paymentMethodsItems]);


  const filteredTenantAdminItems = useMemo(() => {
    if (!searchQuery) return TenantAdminItems;
    return TenantAdminItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, TenantAdminItems]);

  const filteredServiceManagementItems = useMemo(() => {
    if (!searchQuery) return ServiceManagementItems;
    return ServiceManagementItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, ServiceManagementItems]);

  const filteredEngagementItems = useMemo(() => {
    if (!searchQuery) return EngagementItems;
    return EngagementItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, EngagementItems]);

  const filteredAiPlatformItems = useMemo(() => {
    if (!searchQuery) return AI_Platform;
    return AI_Platform.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, AI_Platform]);


  // Determine if sections should be shown based on search results
  const showCrmSection = filteredCrmItems.length > 0;
  const showMastersSection = filteredMastersItems.length > 0;
  const showProductSection = filteredProductItems.length > 0;
  const showPricingSection = filteredPricingItems.length > 0;
  const showConfigurationSection = filteredConfigurationItems.length > 0;
  const showInventorySection = filteredInventoryItems.length > 0;
  const showCustomerSection = filteredCustomerItems.length > 0;
  const showOrdersSection = filteredOrdersItems.length > 0;
  const showOpportunitiesSection = filteredOpportunityItems.length > 0;
  const showPaymentMethodsSection = filteredPaymentMethodsItems.length > 0;
  const showTenantAdminSection = filteredTenantAdminItems.length > 0;
  const showServiceManagementSection = filteredServiceManagementItems.length > 0;
  const showEngagementSection = filteredEngagementItems.length > 0;
  const showAiPlatformSection = filteredAiPlatformItems.length > 0;

  const filteredCheckoutItems = useMemo(() => {
    if (!searchQuery) return checkoutItems;
    return checkoutItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, checkoutItems]);

  const showCheckout = checkoutItems.length > 0;

  // Expanded view for the sidebar - optimized transitions
  const ExpandedNavSection = ({
    title,
    items,
    isOpen,
    onToggle,
  }: {
    title: string;
    items: NavItem[];
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <div>
      <div>
        <ListItem disablePadding component="div">
          <ListItemButton
            onClick={onToggle}
            sx={{
              transition: theme.transitions.create(["background-color"], {
                duration: theme.transitions.duration.shortest,
              }),
            }}
          >
            <ListItemText primary={title} />
            <Box
              component="span"
              sx={{
                transition: theme.transitions.create("transform", {
                  duration: theme.transitions.duration.shortest,
                }),
                transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              }}
            >
              {isOpen ? <ExpandLess /> : <ExpandMore />}
            </Box>
          </ListItemButton>
        </ListItem>
      </div>

      <Collapse
        in={isOpen}
        timeout="auto"
        unmountOnExit={false} // Keep mounted to avoid re-rendering
        sx={{
          transition: theme.transitions.create("max-height", {
            duration: theme.transitions.duration.shortest,
          }),
          width: "100%",
        }}
      >
        <ul className="MuiList-root" aria-label={`${title} submenu`}>
          {items.map((item) => (
            <li key={item.path} style={{ listStyle: "none", padding: 0 }}>
              <ListItemButton
                component={Link}
                href={item.path}
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  // Ensure we're using the fully qualified path with tenant
                  const fullPath = item.path.startsWith('/') && tenant ? 
                    item.path : 
                    `/${tenant}/Crm/${item.path.replace(/^\/+/, '')}`;
                  handleNavigation(fullPath);
                }}
                selected={
                  isPathActive(item.path) || activeNavPath === item.path
                }
                sx={{
                  pl: 2,
                  position: "relative",
                  borderLeft:
                    isPathActive(item.path) || activeNavPath === item.path
                      ? `3px solid ${theme.palette.primary.main}`
                      : "none",
                }}
              >
                <ListItemIcon>
                  {isPending && activeNavPath === item.path ? (
                    <CircularProgress size={20} color="primary" />
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </li>
          ))}
        </ul>
      </Collapse>
    </div>
  );

  // Collapsed view showing only icons - optimized animations
  const CollapsedNavSection = ({
    title,
    items,
  }: {
    title: string;
    items: NavItem[];
  }) => (
    <ul className="MuiList-root" aria-label={title}>
      <li style={{ listStyle: "none", padding: 0 }}>
        <ListItemButton sx={{ justifyContent: "center", py: 1 }}>
          <Tooltip title={title} placement="right">
            <Typography variant="subtitle2" noWrap>
              {title.substring(0, 1)}
            </Typography>
          </Tooltip>
        </ListItemButton>
      </li>
      {items.map((item) => (
        <li key={item.path} style={{ listStyle: "none", padding: 0 }}>
          <ListItemButton
            component={Link}
            href={item.path}
            prefetch={true}
            onClick={(e) => {
              e.preventDefault();
              // Ensure we're using the fully qualified path with tenant
              const fullPath = item.path.startsWith('/') && tenant ? 
                item.path : 
                `/${tenant}/Crm/${item.path.replace(/^\/+/, '')}`;
              handleNavigation(fullPath);
            }}
            selected={pathname === item.path || activeNavPath === item.path}
            sx={{
              minHeight: 48,
              justifyContent: "center",
              px: 2.5,
              borderLeft:
                pathname === item.path || activeNavPath === item.path
                  ? `3px solid ${theme.palette.primary.main}`
                  : "none",
            }}
          >
            <Tooltip title={item.title} placement="right">
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: "auto",
                  justifyContent: "center",
                }}
              >
                {isPending && activeNavPath === item.path ? (
                  <CircularProgress size={20} color="primary" />
                ) : (
                  item.icon
                )}
              </ListItemIcon>
            </Tooltip>
          </ListItemButton>
        </li>
      ))}
    </ul>
  );

  return (
    <Drawer
      variant={variant}
      open={variant === "temporary" ? isOpen : true}
      onClose={onClose}
      anchor={isRTL ? "right" : "left"}
      sx={{
        width: isOpen ? DRAWER_WIDTH : collapsedWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isOpen ? DRAWER_WIDTH : collapsedWidth,
          boxSizing: "border-box",
          overflowX: "hidden",
          borderRight: isRTL ? "none" : `1px solid ${theme.palette.divider}`,
          borderLeft: isRTL ? `1px solid ${theme.palette.divider}` : "none",
          marginTop: "64px", // Height of the AppBar
          height: "calc(100% - 64px)", // Subtract AppBar height
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shortest,
          }),
          boxShadow: isOpen
            ? "0px 2px 4px -1px rgba(0,0,0,0.05), 0px 4px 5px 0px rgba(0,0,0,0.04), 0px 1px 10px 0px rgba(0,0,0,0.03)"
            : "none",
        },
      }}
    >
      {/* Add prefetch links for all routes to improve navigation performance */}
      <Box sx={{ display: "none" }}>
        {[...crmItems, ...mastersItems].map((item) => (
          <Link
            key={`prefetch-${item.path}`}
            href={item.path}
            prefetch={true}
          />
        ))}
      </Box>
      <Box component="nav" role="navigation" aria-label="Side navigation">
        {isOpen ? (
          <>
            <Box sx={{ overflow: "auto" }}>
              {/* Search Box */}
              <Box sx={{ p: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t("app.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      transition: theme.transitions.create(["box-shadow"], {
                        duration: theme.transitions.duration.shortest,
                      }),
                      "&:hover": {
                        boxShadow: `0 0 0 2px ${alpha(
                          theme.palette.primary.main,
                          0.1
                        )}`,
                      },
                      "&.Mui-focused": {
                        boxShadow: `0 0 0 3px ${alpha(
                          theme.palette.primary.main,
                          0.2
                        )}`,
                      },
                    },
                  }}
                />
              </Box>

              <nav aria-label="Main Navigation">
                {showCrmSection && (
                  <ExpandedNavSection
                    title={t("sidenav.items.dashboard")}
                    items={filteredCrmItems}
                    isOpen={crmOpen}
                    onToggle={() => setCrmOpen(!crmOpen)}
                  />
                )}


              {showAiPlatformSection && (
                  <ExpandedNavSection
                    title={t("sidenav.aiPlatform")}
                    items={filteredAiPlatformItems}
                    isOpen={aiPlatformOpen}
                    onToggle={() => setAiPlatformOpen(!aiPlatformOpen)}
                  />
                )}

              {showTenantAdminSection && (
                  <ExpandedNavSection
                    title={t("sidenav.tenantAdmin")}
                    items={filteredTenantAdminItems}
                    isOpen={tenantAdminOpen}
                    onToggle={() => setTenantAdminOpen(!tenantAdminOpen)}
                  />
                )}

                {showServiceManagementSection && (
                  <ExpandedNavSection
                    title={t("sidenav.serviceManagement")}
                    items={filteredServiceManagementItems}
                    isOpen={serviceManagementOpen}
                    onToggle={() => setServiceManagementOpen(!serviceManagementOpen)}
                  />
                )}

                {showEngagementSection && (
                  <ExpandedNavSection
                    title={t("sidenav.engagement")}
                    items={filteredEngagementItems}
                    isOpen={engagementOpen}
                    onToggle={() => setEngagementOpen(!engagementOpen)}
                  />
                )}


                {showProductSection && (
                  <ExpandedNavSection
                    title={t("sidenav.product")}
                    items={filteredProductItems}
                    isOpen={productOpen}
                    onToggle={() => setProductOpen(!productOpen)}
                  />
                )}
                {showInventorySection && (
                  <ExpandedNavSection
                    title={t("sidenav.inventory")}
                    items={filteredInventoryItems}
                    isOpen={inventoryOpen}
                    onToggle={() => setInventoryOpen(!inventoryOpen)}
                  />
                )}
                {showPricingSection && (
                  <ExpandedNavSection
                    title={t("sidenav.pricing")}
                    items={filteredPricingItems}
                    isOpen={pricingOpen}
                    onToggle={() => setPricingOpen(!pricingOpen)}
                  />
                )}
                {showCustomerSection && (
                  <ExpandedNavSection
                    title={t("sidenav.customer")}
                    items={filteredCustomerItems}
                    isOpen={customerOpen}
                    onToggle={() => setCustomerOpen(!customerOpen)}
                  />
                )}
                {showMastersSection && (
                  <ExpandedNavSection
                    title={t("sidenav.masters")}
                    items={filteredMastersItems}
                    isOpen={mastersOpen}
                    onToggle={() => setMastersOpen(!mastersOpen)}
                  />
                )}

                {showConfigurationSection && (
                  <ExpandedNavSection
                    title={t("sidenav.configuration")}
                    items={filteredConfigurationItems}
                    isOpen={configurationOpen}
                    onToggle={() => setConfigurationOpen(!configurationOpen)}
                  />
                )}

                {/* Store Pickup Section */}
                {showCheckout && (
                  <ExpandedNavSection
                    title={t("sidenav.checkout")}
                    items={filteredCheckoutItems}
                    isOpen={storePickupOpen}
                    onToggle={() => setStorePickupOpen(!storePickupOpen)}
                  />
                )}
                {showOrdersSection && (
                  <ExpandedNavSection
                    title={t("sidenav.orders")}
                    items={filteredOrdersItems}
                    isOpen={ordersOpen}
                    onToggle={() => setOrdersOpen(!ordersOpen)}
                  />
                )}
                {showOpportunitiesSection && (
                  <ExpandedNavSection
                    title={t("sidenav.opportunities")}
                    items={filteredOpportunityItems}
                    isOpen={opportunitiesOpen}
                    onToggle={() => setOpportunitiesOpen(!opportunitiesOpen)}
                  />
                )}
               
                {showPaymentMethodsSection && (
                  <ExpandedNavSection
                    title={t("sidenav.paymentMethods")}
                    items={filteredPaymentMethodsItems}
                    isOpen={paymentMethodsOpen}
                    onToggle={() => setPaymentMethodsOpen(!paymentMethodsOpen)}
                  />
                )}
              </nav>
            </Box>
          </>
        ) : (
          // Collapsed view with only icons
          <Box sx={{ overflow: "auto" }}>
            <nav aria-label="Main Navigation">
              {showCrmSection && (
                <CollapsedNavSection
                  title={t("sidenav.crm")}
                  items={filteredCrmItems}
                />
              )}
              {showProductSection && (
                <CollapsedNavSection
                  title={t("sidenav.product")}
                  items={filteredProductItems}
                />
              )}
              {showInventorySection && (
                <CollapsedNavSection
                  title={t("sidenav.inventory")}
                  items={filteredInventoryItems}
                />
              )}
              {showPricingSection && (
                <CollapsedNavSection
                  title={t("sidenav.pricing")}
                  items={filteredPricingItems}
                />
              )}

              {showCustomerSection && (
                <CollapsedNavSection
                  title={t("sidenav.customer")}
                  items={filteredCustomerItems}
                />
              )}
              {showMastersSection && (
                <CollapsedNavSection
                  title={t("sidenav.masters")}
                  items={filteredMastersItems}
                />
              )}
              {showConfigurationSection && (
                <CollapsedNavSection
                  title={t("sidenav.configuration")}
                  items={filteredConfigurationItems}
                />
              )}
              {showOrdersSection && (
                <CollapsedNavSection
                  title={t("sidenav.orders")}
                  items={filteredOrdersItems}
                />
              )}
              {showOpportunitiesSection && (
                <CollapsedNavSection
                  title={t("sidenav.opportunities")}
                  items={filteredOpportunityItems}
                />
              )}
              {showCheckout && (
                <CollapsedNavSection
                  title={t("sidenav.storePickup")}
                  items={filteredCheckoutItems}
                />
              )}
              {showPaymentMethodsSection && (
                <CollapsedNavSection
                  title={t("sidenav.paymentMethods")}
                  items={filteredPaymentMethodsItems}
                />
              )}
            </nav>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
