/**
 * GraphQL Queries und Mutations für Shopify Admin API.
 * 
 * API-Version: 2025-10 (sollte bei Implementierung auf neueste Version aktualisiert werden)
 */

export const GQL_PRODUCTS = `
  query ListProducts($first: Int!, $after: String, $locationId: ID) {
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
                  inventoryLevels(locationIds: [$locationId], first: 1) {
                    edges {
                      node {
                        available
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const GQL_LOCATIONS = `
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

export const GQL_VARIANTS_BULK_UPDATE = `
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

export const GQL_INVENTORY_SET = `
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

export const GQL_SHOP_ACCESS_SCOPES = `
  query GetShopAccessScopes {
    shop {
      accessScopes {
        handle
      }
    }
  }
`;

