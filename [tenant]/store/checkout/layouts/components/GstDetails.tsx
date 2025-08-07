"use client";

import React from "react";
import { Grid, TextField } from "@mui/material";
import { useForm, Controller } from "react-hook-form";

export interface GstDetailsData {
  gstNumber: string;
  businessName: string;
}

interface GstDetailsFormProps {
  onSubmit: (data: GstDetailsData) => void;
  defaultValues?: Partial<GstDetailsData>;
}

export const GstDetailsForm: React.FC<GstDetailsFormProps> = ({
  onSubmit,
  defaultValues = { gstNumber: "", businessName: "" },
}) => {
  const { control, handleSubmit } = useForm<GstDetailsData>({
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={2}>

 

        <Grid size={{xs:12, sm:6}}>
          <Controller
            name="gstNumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="GST Number"
                variant="outlined"
                size="small"
                fullWidth
                inputProps={{
                  maxLength: 15,
                  style: { textTransform: "uppercase" },
                }}
              />
            )}
          />
        </Grid>
        <Grid size={{xs:12, sm:6}}>
          <Controller
            name="businessName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Business Name"
                variant="outlined"
                size="small"
                fullWidth
              />
            )}
          />
        </Grid>
      </Grid>
    </form>
  );
};

export default GstDetailsForm;
