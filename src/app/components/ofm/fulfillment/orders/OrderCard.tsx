'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip, 
  Box, 
  IconButton,
  Checkbox,
  Divider,
  Button
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { OrderFulfillmentItem } from '@/types/ofm/fulfillment';
import { useTranslation } from 'next-i18next';
import { format } from 'date-fns';

interface OrderCardProps {
  order: OrderFulfillmentItem;
  selected: boolean;
  onSelect: (orderId: string, selected: boolean) => void;
  onProcessOrder: (orderId: string) => void;
}

/**
 * Component that displays an individual order card
 */
const OrderCard: React.FC<OrderCardProps> = ({
  order,
  selected,
  onSelect,
  onProcessOrder,
}) => {
  const { t } = useTranslation('ofm');
  
  // Format date
  const formattedDate = format(new Date(order.order_date), 'MMMM d, yyyy HH:mm');
  
  // Get status chip color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processing':
        return 'primary';
      case 'PendingQC':
        return 'secondary';
      case 'ReadyToShip':
        return 'success';
      case 'Completed':
        return 'default';
      case 'Exception':
        return 'error';
      default:
        return 'default';
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(order.order_id, event.target.checked);
  };

  // Handle process order button click
  const handleProcessOrder = () => {
    onProcessOrder(order.order_id);
  };

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 2,
        border: selected ? '1px solid primary.main' : '1px solid divider',
        backgroundColor: selected ? 'action.selected' : 'background.paper'
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {/* Checkbox and Order ID */}
          <Grid item xs={12} container alignItems="center">
            <Checkbox 
              checked={selected}
              onChange={handleCheckboxChange}
              inputProps={{ 'aria-label': `Select order ${order.order_id}` }}
            />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              #{order.order_id}
            </Typography>
            <Chip 
              label={order.overall_fulfillment_status}
              color={getStatusColor(order.overall_fulfillment_status) as any}
              size="small"
              sx={{ mr: 1 }}
            />
            <IconButton aria-label="order actions" size="small">
              <MoreVertIcon />
            </IconButton>
          </Grid>
          
          {/* Order Date */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              {formattedDate}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Divider />
          </Grid>
          
          {/* Customer, Items, Total Value */}
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              {t('ofm:orders.customer')}
            </Typography>
            <Typography variant="body2">
              {order.customer_id}
            </Typography>
          </Grid>
          
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              {t('ofm:orders.items')}
            </Typography>
            <Typography variant="body2">
              {order.item_count} {t('ofm:orders.itemsCount')}
            </Typography>
          </Grid>
          
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              {t('ofm:orders.totalValue')}
            </Typography>
            <Typography variant="body2">
              ${order.total_value?.toFixed(2) || '0.00'}
            </Typography>
          </Grid>
          
          {/* Workflow and Next Action */}
          <Grid item xs={12}>
            <Box display="flex" mt={1}>
              {order.involved_workflow_names.map((workflow, index) => (
                <Chip 
                  key={index}
                  label={workflow}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {t('ofm:orders.nextAction')}: {order.next_action_hint}
              </Typography>
              <Button
                variant="text"
                color="primary"
                endIcon={<ArrowForwardIcon />}
                onClick={handleProcessOrder}
              >
                {t('ofm:orders.processOrder')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
