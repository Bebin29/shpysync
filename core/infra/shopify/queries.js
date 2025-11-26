"use strict";
/**
 * GraphQL Queries und Mutations für Shopify Admin API.
 *
 * API-Version: 2025-10 (sollte bei Implementierung auf neueste Version aktualisiert werden)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GQL_SHOP_ACCESS_SCOPES = exports.GQL_INVENTORY_SET = exports.GQL_VARIANTS_BULK_UPDATE = exports.GQL_LOCATIONS = exports.GQL_PRODUCTS = void 0;
exports.GQL_PRODUCTS = `
  query ListProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: ID) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          variants(first: 250) {
            edges {
              node {
                id
                sku
                barcode
                price
                title
                inventoryItem {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;
exports.GQL_LOCATIONS = `
  query ListLocations($first: Int!, $after: String) {
    locations(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;
exports.GQL_VARIANTS_BULK_UPDATE = `
  mutation UpdateVariantPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(
      productId: $productId
      variants: $variants
      allowPartialUpdates: true
    ) {
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
exports.GQL_INVENTORY_SET = `
  mutation SetInventory($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        createdAt
        reason
        referenceDocumentUri
        changes {
          name
          delta
          quantityAfterChange
        }
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;
exports.GQL_SHOP_ACCESS_SCOPES = `
  query GetShopAccessScopes {
    shop {
      accessScopes {
        handle
      }
    }
  }
`;
