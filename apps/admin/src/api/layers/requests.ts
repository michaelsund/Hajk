import { Layer, LayersApiResponse, LayerTypesApiResponse } from "./types";
import { getApiClient, InternalApiError } from "../../lib/internal-api-client";

/**
 * This module provides API request functions to interact with the backend
 * services for fetching data related to layers.
 *
 * - The `getLayers` function retrieves a list of all layers.
 * - The `getLayerById` function fetches details of a specific layer by its ID.
 * - The `getLayerTypes` function retrieves all available layer types.
 * - The `getLayersByType` function fetches layers by their type.
 *
 * These functions utilize a custom Axios instance and throw appropriate error messages for failures.
 *
 * All functions return a Promise with the expected data format or throw an error in case of failure.
 */

// Fetch layers
export const getLayers = async (): Promise<Layer[]> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.get<LayersApiResponse>("/layers");

    if (!response.data) {
      throw new Error("No layers data found");
    }

    return response.data.layers;
  } catch (error) {
    const axiosError = error as InternalApiError;

    if (axiosError.response) {
      throw new Error(
        `Failed to fetch layers. ErrorId: ${axiosError.response.data.errorId}.`
      );
    } else {
      throw new Error(`Failed to fetch layers`);
    }
  }
};

// Fetch a single layer by its ID
export const getLayerById = async (layerId: string): Promise<Layer> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.get<Layer>(`/layers/${layerId}`);
    if (!response.data) {
      throw new Error("No layer data found");
    }
    return response.data;
  } catch (error) {
    const axiosError = error as InternalApiError;

    if (axiosError.response) {
      throw new Error(
        `Failed to fetch layer. ErrorId: ${axiosError.response.data.errorId}.`
      );
    } else {
      throw new Error(`Failed to fetch layer`);
    }
  }
};

// Fetch layers by their type
export const getLayersByType = async (type: string): Promise<Layer[]> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.get<LayersApiResponse>(
      `/layers/types/${type}`
    );
    if (!response.data) {
      throw new Error("No layers found for this type");
    }
    return response.data.layers;
  } catch (error) {
    const axiosError = error as InternalApiError;

    if (axiosError.response) {
      throw new Error(
        `Failed to fetch layers by type. ErrorId: ${axiosError.response.data.errorId}.`
      );
    } else {
      throw new Error(`Failed to fetch layers by type`);
    }
  }
};

// Fetch all available layer types
export const getLayerTypes = async (): Promise<string[]> => {
  const internalApiClient = getApiClient();
  try {
    const response = await internalApiClient.get<LayerTypesApiResponse>(
      "/layers/types"
    );

    if (!response.data) {
      throw new Error("No layer types found");
    }
    return response.data.layerTypes;
  } catch (error) {
    const axiosError = error as InternalApiError;

    if (axiosError.response) {
      throw new Error(
        `Failed to fetch layer types. ErrorId: ${axiosError.response.data.errorId}.`
      );
    } else {
      throw new Error(`Failed to fetch layer types`);
    }
  }
};