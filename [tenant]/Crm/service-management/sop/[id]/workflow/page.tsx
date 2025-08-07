"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useMultiTenantRouter } from "../../../../../../hooks/service-management/useMultiTenantRouter";
import { sopApi, SOPStep } from "../../../../../../services_service_management/sop";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
// import Toolbox from "/sop/steps/workflow/Toolbox";
// import Toolbox from "/sop/steps/workflow/Toolbox";
import Toolbox from "../../../../../../components/ServiceManagement/sop/steps/workflow/Toolbox"
import BlockDefinition from "../../../../../../components/ServiceManagement/sop/steps/workflow/BlockDefinition"
import StepFormDrawer from "../../../../../../components/ServiceManagement/sop/steps/StepFormDrawer"
import { useConfirm } from "../../../../../../components/common/useConfirm";


// Initial nodes and edges for React Flow
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

interface BlockDefinition {
  id: string;
  type: string;
  objectName: string;
  data?: any;
}

/**
 * Step Workflow Configuration Page
 * Implements a workflow editor using React Flow
 */
export default function WorkflowPage() {
  const router = useMultiTenantRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sop_id = Number(params?.id);
  const step_id = Number(searchParams?.get("step_id"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepData, setStepData] = useState<SOPStep | null>(null);
  const [steps, setSteps] = useState<SOPStep[] | null>(null);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // State for selected node/block
  const [selectedBlock, setSelectedBlock] = useState<BlockDefinition | null>(
    null
  );

  // State for right drawer (block definition)
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState<boolean>(false);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");

  // Initialize confirmation dialog
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    document.title = `SOP | Step - ${stepData?.step_name || ""}`;
  }, [stepData]);

  // Fetch step data when the component mounts
  async function fetchStepData() {
    if (!step_id) {
      setError("Step ID is required");
      setLoading(false);
      return;
    }

    try {
      // Fetch step details
      const stepData = await sopApi.getSOPStepById(step_id);
      setStepData(stepData);

      // Process step_objects to create nodes if they exist
      if (stepData.step_objects && stepData.step_objects.length > 0) {
        const newNodes = stepData.step_objects.map(
          (stepObj: any, index: number) => {
            const nodeId =
              stepObj.object_type === "FORM"
                ? `form-${stepObj.id}`
                : `email-${stepObj.id}`;

            return {
              id: nodeId,
              type: "default",
              position: stepObj.metadata?.position || {
                x: 100,
                y: 100 + index * 100,
              },
              data: {
                name: stepObj.metadata?.name || `Node ${index + 1}`,
                label: stepObj.metadata?.name || `Node ${index + 1}`,
                type: stepObj.object_type === "FORM" ? "form" : "email",
                ...stepObj.metadata,
                ...(stepObj.object_type === "FORM" && {
                  fields:
                    stepObj.form_fields?.map((field: any) => ({
                      id: `field-${field.id}`,
                      field_name: field.field_name,
                      field_type: field.field_type,
                      field_attributes: field.field_attributes,
                      display_order: field.display_order,
                      stepObjectId: stepObj.id,
                    })) || [],
                }),
              },
            };
          }
        );
        setNodes(newNodes);
      }
    } catch (err) {
      console.error("Error fetching step data:", err);
      setError("Failed to load step data. Please try again.");
      setSnackbarMessage("Failed to load workflow data");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }

  const fetchAllSteps = async () => {
    try {
      const stepsData = await sopApi.getSOPSteps(sop_id);
      const results = stepsData?.results;
      setSteps(results);
    } catch (err) {
      console.error("Error fetching steps data:", err);
      setError("Failed to load steps data. Please try again.");
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        await fetchStepData();
        await fetchAllSteps();
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError("Failed to load initial data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [step_id, sop_id]);

  // Handle drag start from toolbox
  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("text/plain", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop event to add new node
  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      // Get current bounds of the flow container
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) {
        console.error("No bounds found");
        return;
      }

      // Try to get the node type from dataTransfer
      let type = event.dataTransfer.getData("application/reactflow");

      if (!type) {
        // Fallback to plain text if reactflow type isn't available
        type = event.dataTransfer.getData("text/plain");
      }

      // Check if the dropped element is valid
      if (!type) {
        console.error("No valid type found in dataTransfer");
        return;
      }

      // Capture the currently selected block before creating a new one
      const currentSelectedBlock = selectedBlock;

      // Calculate position where block was dropped
      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      // Create a new node
      const newNode = {
        id: `${type}-${Date.now()}`,
        type: "default",
        position,
        data: {
          name: type === "form" ? "Form" : "Send Email",
          label: type === "form" ? "Form" : "Send Email",
          visible: true,
          type: type,
        },
      };

      // Check if there's already a selected block
      if (currentSelectedBlock) {
        // Find the node in nodes array to access fields data
        const selectedNode = nodes.find(
          (node) => node.id === currentSelectedBlock.id
        );

        // Check if the current block has fields
        const fields = selectedNode?.data?.fields as any[] | undefined;
        const hasFields = fields && fields.length > 0;

        if (hasFields) {
          // If the block has fields, simply select the new block
          setNodes((nds) => nds.concat(newNode));
          setSelectedBlock({
            id: newNode.id,
            type: type,
            objectName: newNode.data.name,
            data: newNode.data,
          });
        } else {
          // Check if the block has data
          const description = selectedNode?.data?.description as
            | string
            | undefined;
          const fillingInstructions = selectedNode?.data
            ?.fillingInstructions as string | undefined;
          const hasData =
            currentSelectedBlock.type === "form" &&
            (description?.trim() || fillingInstructions?.trim());

          if (hasData) {
            // Show confirmation dialog
            const confirmed = await confirm({
              title: "Unsaved Changes",
              message: `Doing this will lose all your previously entered data for "${
                currentSelectedBlock?.data?.label ||
                currentSelectedBlock.objectName
              }". Are you sure you want to go ahead and define a new ${type}?`,
              confirmText: "Continue",
              cancelText: "Cancel",
              confirmColor: "warning",
            });

            if (confirmed) {
              // User confirmed, delete current block and add new one
              setNodes((nds) => {
                // First filter out the old node
                const filteredNodes = nds.filter(
                  (node) => node.id !== currentSelectedBlock.id
                );
                // Then add the new one
                return filteredNodes.concat(newNode);
              });
              setSelectedBlock({
                id: newNode.id,
                type: type,
                objectName: newNode.data.name,
                data: newNode.data,
              });
            }
            // If not confirmed, do nothing
          } else {
            // No data, directly remove current block and add new one
            setNodes((nds) => {
              // First filter out the old node
              const filteredNodes = nds.filter(
                (node) => node.id !== currentSelectedBlock.id
              );
              // Then add the new one
              return filteredNodes.concat(newNode);
            });
            setSelectedBlock({
              id: newNode.id,
              type: type,
              objectName: newNode.data.name,
              data: newNode.data,
            });
          }
        }
      } else {
        // No block currently selected, just add the new one
        setNodes((nds) => nds.concat(newNode));
        setSelectedBlock(null);
        setSelectedBlock({
          id: newNode.id,
          type: type,
          objectName: newNode.data.name,
          data: newNode.data,
        });
      }

      setRightDrawerOpen(true);
    },
    [setNodes, selectedBlock, nodes, confirm]
  );

  // Handle node click to open right drawer
  const onNodeClick = useCallback(async (event: React.MouseEvent, node: Node) => {
    if (!node || !node.data) return;

    // Debug: Log the original node to see all properties
    console.log('Original Node Object:', node);
    console.log('Original Node Data:', node.data);
    console.log('Fields in original node:', node.data.fields);

    // Capture the currently selected block before selecting a new one
    const currentSelectedBlock = selectedBlock;

    // Create a deep copy of the node data to ensure all nested properties are included
    const newNode = {
      id: node.id,
      type: node.data.type as string,
      objectName: node.data.name as string,
      data: JSON.parse(JSON.stringify(node.data)), // Deep copy to ensure fields array is preserved
    }
    console.log('New Node Object:', newNode);
    console.log('Fields in new node:', newNode.data?.fields);

    // If there's no selected block, select the clicked node
    if (!currentSelectedBlock) {
      console.log('node')
      // Log the exact data before setting state
      console.log('Setting selectedBlock with fields:', newNode.data?.fields);
      setSelectedBlock({
        ...newNode,
        // Ensure fields are explicitly copied
        data: {
          ...newNode.data,
          fields: newNode.data?.fields || [],
        }
      });
      setRightDrawerOpen(true);
      return;
    }

    // If the clicked node is already selected, just ensure drawer is open
    if (currentSelectedBlock.id === node.id) {
      // Refresh the selectedBlock with current node data to ensure fields are included
      setSelectedBlock({
        ...newNode,
        data: {
          ...newNode.data,
          fields: newNode.data?.fields || [],
        }
      });
      setRightDrawerOpen(true);
      return;
    }

    // Find the currently selected node in nodes array to access fields data
    const selectedNode = nodes.find(n => n.id === currentSelectedBlock.id);
    
    // Check if the current block has fields
    const fields = selectedNode?.data?.fields as any[] | undefined;
    const hasFields = fields && fields.length > 0;

    if (hasFields) {
      // If the block has fields, simply select the new node
      // Ensure fields are explicitly preserved
      setSelectedBlock({
        ...newNode,
        data: {
          ...newNode.data,
          fields: newNode.data?.fields || [],
        }
      });
      setRightDrawerOpen(true);
    } else {
      // Check if the block has data
      const description = selectedNode?.data?.description as string | undefined;
      const fillingInstructions = selectedNode?.data?.fillingInstructions as string | undefined;
      const hasData = 
        currentSelectedBlock.type === "form" &&
        (description?.trim() || fillingInstructions?.trim());

      if (hasData) {
        // Show confirmation dialog
        const confirmed = await confirm({
          title: "Unsaved Changes",
          message: `Doing this will lose all your previously entered data for "${currentSelectedBlock?.data?.label || currentSelectedBlock.objectName}". Are you sure you want to go ahead with this?`,
          confirmText: "Continue",
          cancelText: "Cancel",
          confirmColor: "warning",
        });

        if (confirmed) {
          // User confirmed, select the new node
          setNodes((nodes) => nodes.filter((node) => node.id !== selectedBlock.id));
          // Ensure fields are explicitly preserved
          setSelectedBlock({
            ...newNode,
            data: {
              ...newNode.data,
              fields: newNode.data?.fields || [],
            }
          });
          setRightDrawerOpen(true);
        }
        // If not confirmed, do nothing
      } else {
        // No data, directly select the new node
        setNodes((nodes) => nodes.filter((node) => node.id !== selectedBlock.id));
        setSelectedBlock(newNode);
        setRightDrawerOpen(true);
      }
    }
  }, [nodes, selectedBlock, confirm]);

  // Handle delete node
  const handleDeleteNode = useCallback(() => {
    if (selectedBlock) {
      setNodes((nodes) => nodes.filter((node) => node.id !== selectedBlock.id));
      setRightDrawerOpen(false);
      setSelectedBlock(null);
    }
  }, [selectedBlock, setNodes]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete key handler - check if we have a selected block and right drawer is open
      if (event.key === "Delete" && selectedBlock && rightDrawerOpen) {
        handleDeleteNode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedBlock, handleDeleteNode, rightDrawerOpen]);

  // Handle save changes button click
  const handleSaveChanges = async () => {
    const generatePayload = (nodes: Node[]) => {
      return nodes.map((node, index) => {
        const nodeData = node.data || {};
        const fields = Array.isArray(nodeData.fields) ? nodeData.fields : [];
        const { type, ...restData } = nodeData;

        return {
          sop_step_id: Number(step_id),
          sequence: index + 1,
          object_type: nodeData.type === "form" ? "FORM" : "SEND_EMAIL",
          visible: nodeData.visible === false ? false : true,
          metadata: {
            ...restData,
            position: node.position,
          },
          ...(fields.length > 0 && {
            form_fields_payload: fields,
          }),
        };
      });
    };
    try {
      const payload = generatePayload(nodes);
      console.log(payload);
      // await sopApi.createStepObjects(Number(step_id), payload);
      setSnackbarMessage("Workflow saved successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error saving workflow:", error);
      setSnackbarMessage("Failed to save workflow");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleSaveBlock = (blockData: any) => {
    if (!blockData) return;
    console.log(blockData);

    // Update node with the configured data
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === blockData.id) {
          return {
            ...node,
            data: {
              fields: blockData.data.fields,
              description: blockData.data.description,
              fillingInstructions: blockData.data.fillingInstructions,
              visible: blockData.data.visible,
              objectName: blockData.objectName,
              name: blockData.objectName,
              label: blockData.objectName,
              type: blockData.type,
            },
          };
        }
        return node;
      })
    );

    setRightDrawerOpen(false);
  };

  const handleStepSaved = async () => {
    try {
      setLoading(true);
      await fetchStepData();
      await fetchAllSteps();
      setSnackbarMessage("Step details updated");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error fetching step data:", error);
      setError("Failed to load step data. Please try again.");
      setSnackbarMessage("Failed to load workflow data");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockFieldChange = (id: string, field: string, value: any) => {
    // Update nodes state
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // Handle special case for object name which updates multiple fields
          if (field === "objectName") {
            return {
              ...node,
              data: {
                ...node.data,
                name: value,
                label: value,
                objectName: value,
              },
            };
          }

          // Handle nested data fields
          if (field.startsWith("data.")) {
            const nestedField = field.split(".")[1];
            return {
              ...node,
              data: {
                ...node.data,
                [nestedField]: value,
              },
            };
          }

          // Handle direct fields
          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          };
        }
        return node;
      })
    );

    // Also update the selectedBlock if it's the same block being modified
    if (selectedBlock && selectedBlock.id === id) {
      if (field === "objectName") {
        // Special case for objectName updates multiple properties
        setSelectedBlock({
          ...selectedBlock,
          objectName: value,
          data: {
            ...selectedBlock.data,
            name: value,
            label: value,
            objectName: value,
          },
        });
      } else if (field.startsWith("data.")) {
        // Handle nested data fields
        const nestedField = field.split(".")[1];
        setSelectedBlock({
          ...selectedBlock,
          data: {
            ...selectedBlock.data,
            [nestedField]: value,
          },
        });
      } else {
        // Handle direct fields
        setSelectedBlock({
          ...selectedBlock,
          data: {
            ...selectedBlock.data,
            [field]: value,
          },
        });
      }
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!stepData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Step not found</Alert>
      </Box>
    );
  }

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Grid container sx={{ height: "99vh" }}>
      {/* Left Section - Toolbox */}
      <Grid
        size={2}
        sx={{ borderRight: "1px solid #e0e0e0", p: 2, backgroundColor: "#fff" }}
      >
        <Toolbox onDragStart={onDragStart} />
      </Grid>

      {/* Middle Section - Canvas */}
      <Grid size={rightDrawerOpen ? 7 : 10} sx={{ height: "100%" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 2,
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#fff",
          }}
        >
          <IconButton onClick={() => router.back()}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, mb: "0px" }}>
            {stepData?.step_name || "Workflow Editor"}
          </Typography>
          <IconButton sx={{ ml: 1 }} onClick={() => setFormDrawerOpen(true)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            sx={{ ml: "auto" }}
            onClick={handleSaveChanges}
          >
            Save Changes
          </Button>
        </Box>

        <Box sx={{ height: "calc(100% - 64px)" }} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodesDraggable={true}
            onNodeClick={onNodeClick}
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
          </ReactFlow>
        </Box>
      </Grid>

      {/* Right Section - Block Definition */}
      {rightDrawerOpen && (
        <Grid
          size={3}
          sx={{
            borderLeft: "1px solid #e0e0e0",
            backgroundColor: "#fff",
          }}
        >
          <BlockDefinition
            selectedBlock={selectedBlock}
            onSave={handleSaveBlock}
            onClose={() => {
              setRightDrawerOpen(false);
              setSelectedBlock(null);
            }}
            onDelete={handleDeleteNode}
            onFieldChange={handleBlockFieldChange}
          />
        </Grid>
      )}

      {step_id && (
        <StepFormDrawer
          open={formDrawerOpen}
          onClose={() => setFormDrawerOpen(false)}
          sopId={sop_id}
          steps={steps}
          editStepId={step_id}
          onStepSaved={handleStepSaved}
          popover={false}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog Component */}
      <ConfirmDialog />
    </Grid>
  );
}
