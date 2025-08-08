'use server';

import ImageKit from 'imagekit';

// Initialize ImageKit with the user's credentials
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_4LCqo0j/Bj3x3r+La+owmYboOi4=',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'private_lUwavdT/DF+PaLkcsGKhwwWRLbM=',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/lvioy81zs'
});

interface TransformImageParams {
  imageData: string; // Base64 encoded image
  transformations: string[]; // Array of transformation values
  prompt?: string; // Optional text prompt
  variationId?: number; // Optional variation ID for e-genvar
  aspectRatio?: string; // Optional aspect ratio (format: "width:height")
  cropMode?: string; // Optional crop mode
  width?: number; // Optional width
  height?: number; // Optional height
  focus?: string; // Optional focus parameter
}

export async function transformImage({ 
  imageData, 
  transformations, 
  prompt, 
  variationId,
  aspectRatio,
  cropMode,
  width,
  height,
  focus
}: TransformImageParams): Promise<string> {
  console.log('Transforming image with options:', transformations);
  try {
    // Remove data URL prefix if present
    const base64Data = imageData.includes('base64,') 
      ? imageData.split('base64,')[1] 
      : imageData;
    
    // Upload the image to ImageKit
    const uploadResponse = await imagekit.upload({
      file: base64Data,
      fileName: `transform_${Date.now()}.jpg`,
      useUniqueFileName: true
    });

    // Build transformation parameters based on selected options
    const transformationParams: Record<string, any> = {};
    
    // Add width, height, aspect ratio, crop mode, and focus if provided
    if (width) {
      transformationParams.w = width;
    }
    
    if (height) {
      transformationParams.h = height;
    }
    
    if (aspectRatio && (!width || !height)) {
      // Parse aspect ratio (format: "width:height")
      const [arWidth, arHeight] = aspectRatio.split(':').map(Number);
      if (arWidth && arHeight) {
        transformationParams.ar = `${arWidth}-${arHeight}`;
      }
    }
    
    if (cropMode) {
      transformationParams.cm = cropMode;
    }
    
    if (focus) {
      transformationParams.fo = focus;
    }
    
    // Create an array to store transformation chains
    const transformationChains: string[] = [];
    
    if (transformations.includes('remove_bg')) {
      // Use ImageKit's background removal transformation
      transformationChains.push('e-removedotbg');
    }
    
    if (transformations.includes('blur_bg')) {
      // Apply background blur using ImageKit's changebg transformation
      // First remove background, then change to blurred background
      if (!transformations.includes('remove_bg')) {
        transformationChains.push('e-removedotbg');
      }
      transformationChains.push('e-changebg-prompt-blurred background');
    }
    
    if (transformations.includes('auto_tone')) {
      // Use ImageKit's retouch transformation
      transformationChains.push('e-retouch');
    }
    
    if (transformations.includes('polish')) {
      // Combine quality and sharpness
      transformationParams.q = 90;
      transformationParams.sharp = 15;
    }
    
    if (transformations.includes('upscale')) {
      // Use ImageKit's upscale transformation
      transformationChains.push('e-upscale');
    }
    
    if (transformations.includes('enhance_faces')) {
      // Use ImageKit's face-aware focus
      transformationParams['fo'] = 'face';
    }
    
    if (transformations.includes('generate_variations')) {
      // Use ImageKit's variation generation transformation
      transformationChains.push('e-genvar');
      
      // If a variation ID is provided, add it as a query parameter later
    }
    
    // If there's a text prompt, use it for generative transformations
    if (prompt && prompt.trim()) {
      // If no specific transformations are selected but there's a prompt,
      // use the prompt for background changing
      transformationChains.push(`e-changebg-prompt-${encodeURIComponent(prompt.trim())}`);
    }
    
    // Create the transformation URL combining parameters and chains
    let transformationString = Object.entries(transformationParams)
      .map(([key, value]) => `${key}-${value}`)
      .join(',');
    
    // Get the transformed image URL
    let transformedUrl;
    
    // Prepare additional query parameters
    const queryParams: Record<string, any> = {};
    
    if (transformationChains.length > 0) {
      // Use chained transformations with colons between them
      const chainedTransformations = transformationChains.join(':');
      
      // If we have both regular params and chained transformations
      if (transformationString) {
        transformationString = `${transformationString}:${chainedTransformations}`;
        queryParams.tr = transformationString;
      } else {
        // Only chained transformations
        queryParams.tr = chainedTransformations;
      }
      
      // Add variation ID if provided (for e-genvar)
      if (variationId !== undefined && transformationChains.includes('e-genvar')) {
        queryParams.v = variationId.toString();
      }
      
      // Generate a signed URL with expiration
      const expiryTimestamp = Math.floor(Date.now() / 1000) + 3600; // URL valid for 1 hour
      
      transformedUrl = imagekit.url({
        src: uploadResponse.url,
        transformationPosition: 'query',
        queryParameters: queryParams,
        signed: true,
        expireSeconds: expiryTimestamp
      });
    } else {
      // Only regular transformation parameters
      // Generate a signed URL with expiration
      const expiryTimestamp = Math.floor(Date.now() / 1000) + 3600; // URL valid for 1 hour
      
      transformedUrl = imagekit.url({
        src: uploadResponse.url,
        transformation: [transformationParams],
        queryParameters: variationId !== undefined ? { v: variationId.toString() } : undefined,
        signed: true,
        expireSeconds: expiryTimestamp
      });
    }
    
    console.log('Transformed URL:', transformedUrl);
    return transformedUrl;
  } catch (error) {
    console.error('Error transforming image:', error);
    throw new Error('Failed to transform image');
  }
}
