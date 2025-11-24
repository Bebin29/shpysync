import csv
import json
import logging
import re
import time
import unicodedata
from typing import Dict, List, Optional, Tuple, Iterable
from collections import defaultdict
import io

import requests
from tqdm import tqdm

# =========================
# Konfiguration
# =========================
API_VERSION = "2025-07"  # GraphQL Admin API
DEFAULT_SLEEP = 0.2
MAX_RETRIES = 5
BACKOFF_FACTOR = 1.5

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
# Für detailliertes Debugging, bei Bedarf aktivieren:
# logging.getLogger().setLevel(logging.DEBUG)

# =========================
# Hilfsfunktionen
# =========================
def _norm(s: str) -> str:
    if s is None:
        return ""
    s = unicodedata.normalize("NFKC", s).strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s

def column_letter_to_index(letter: str) -> int:
    letter = letter.upper()
    res = 0
    for ch in letter:
        res = res * 26 + (ord(ch) - ord('A') + 1)
    return res - 1

def http_post_with_retries(url: str, headers: Dict[str, str], payload: dict) -> requests.Response:
    attempt = 0
    while True:
        resp = requests.post(url, headers=headers, data=json.dumps(payload))
        logging.debug(f"POST {url} -> {resp.status_code} | cost={resp.headers.get('X-Request-Cost')}")
        if resp.status_code in (429,) or 500 <= resp.status_code < 600:
            if attempt >= MAX_RETRIES:
                return resp
            retry_after = resp.headers.get("Retry-After")
            if retry_after:
                try:
                    wait = max(float(retry_after), 1.0)
                except ValueError:
                    wait = 2.0 * (BACKOFF_FACTOR ** attempt)
            else:
                wait = 1.0 * (BACKOFF_FACTOR ** attempt)
            logging.warning(f"HTTP {resp.status_code} – Retry in {wait:.2f}s (Versuch {attempt+1}/{MAX_RETRIES})")
            time.sleep(wait)
            attempt += 1
            continue
        return resp
        
def normalize_price_to_money_str(val: str) -> str:
    """
    Nimmt Preisstrings wie '6,5', '6.5', '1.234,56', '1,234.56', '  12 € ', etc.
    und gibt eine Shopify-kompatible Money-String '12.34' mit Punkt und 2 Dezimalen zurück.
    """
    if val is None:
        raise ValueError("Preis ist None")
    s = val.strip()
    # Währungen/Leerzeichen/Sondertrennzeichen entfernen
    for t in ["€", "EUR", "eur"]:
        s = s.replace(t, "")
    s = s.replace(" ", "").replace("'", "")
    # Fälle:
    #  - sowohl Komma & Punkt vorhanden -> meistens europäisch: Punkt = Tausender, Komma = Dezimal
    #  - nur Komma -> Dezimal-Komma
    #  - nur Punkt -> Dezimal-Punkt
    if "," in s and "." in s:
        # Entferne Tausenderpunkte, ersetze Dezimalkomma durch Dezimalpunkt
        s = s.replace(".", "").replace(",", ".")
    elif "," in s and "." not in s:
        s = s.replace(",", ".")
    # sonst: schon ok
    # Jetzt als Float parsen und auf 2 Nachkommastellen formatieren
    amount = float(s)
    return f"{amount:.2f}"

def coalesce_inventory_updates(
    updates: Iterable[Tuple[str, int]],
    location_gid: str
) -> List[Tuple[str, int]]:
    """
    Konsolidiert Inventory-Updates auf eindeutige (inventoryItemId, locationId)-Paare.
    Last-write-wins: der letzte Eintrag für ein Item überschreibt frühere.
    """
    last_values: Dict[str, int] = {}
    count_by_item: defaultdict[str, int] = defaultdict(int)

    for item_gid, qty in updates:
        count_by_item[item_gid] += 1
        last_values[item_gid] = qty  # letzter gewinnt

    # Logging zu Duplikaten (nur Infos)
    dups = {k: c for k, c in count_by_item.items() if c > 1}
    if dups:
        # Logge nur die Anzahl; Details optional
        logging.warning(f"Inventory: {len(dups)} Items hatten Duplikate im CSV/Mapping (werden koalesziert).")

    # zurück als Liste (ein Eintrag pro Item)
    return [(item_gid, last_values[item_gid]) for item_gid in last_values.keys()]

# =========================
# GraphQL Client
# =========================
def gql(shop_url: str, access_token: str, query: str, variables: dict) -> dict:
    url = f"{shop_url}/admin/api/{API_VERSION}/graphql.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }
    payload = {"query": query, "variables": variables}
    resp = http_post_with_retries(url, headers, payload)
    time.sleep(DEFAULT_SLEEP)

    logging.debug(f"RespHeaders: rate={resp.headers.get('X-Shopify-Shop-Api-Call-Limit')} | cost={resp.headers.get('X-Request-Cost')}")
    if resp.status_code != 200:
        logging.error(f"GQL HTTP {resp.status_code} | preview: {resp.text[:800]}")
        raise RuntimeError(f"GraphQL HTTP {resp.status_code}")

    data = resp.json()
    if "errors" in data:
        logging.error(f"GQL top-level errors: {data['errors']}")
        raise RuntimeError("GraphQL top-level errors")
    return data["data"]

# =========================
# GraphQL Queries / Mutations (Docs verlinkt in Kommentar)
# =========================

# products (Cursor-Pagination, bis 250/Seite) – Titel + Varianten (id, sku, barcode, price, inventoryItem)
# Docs: products query + ProductVariant object + GraphQL pagination guide
# https://shopify.dev/docs/api/admin-graphql/latest/queries/products
# https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant
# https://shopify.dev/docs/api/usage/pagination-graphql
GQL_PRODUCTS = """
query ListProducts($first:Int!, $after:String) {
  products(first: $first, after: $after, sortKey: ID) {
    pageInfo { hasNextPage endCursor }
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
              inventoryItem { id }
            }
          }
        }
      }
    }
  }
}
"""

# Locations (für Name->ID)
# https://shopify.dev/docs/api/admin-graphql/latest/queries/locations
GQL_LOCATIONS = """
query ListLocations($first:Int!, $after:String) {
  locations(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges { node { id name } }
  }
}
"""

# Preise aktualisieren (Bulk) – productVariantsBulkUpdate
# https://shopify.dev/docs/api/admin-graphql/latest/mutations/productvariantsbulkupdate
GQL_VARIANTS_BULK_UPDATE = """
mutation UpdateVariantPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants, allowPartialUpdates: true) {
    productVariants { id }
    userErrors { field message }
  }
}
"""

# Bestände setzen (empfohlen) – inventorySetQuantities
# https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventorySetQuantities
GQL_INVENTORY_SET = """
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
"""

# =========================
# Daten holen
# =========================
def get_all_products_graphql(shop_url: str, access_token: str) -> List[dict]:
    items: List[dict] = []
    after = None
    page = 0
    while True:
        page += 1
        data = gql(shop_url, access_token, GQL_PRODUCTS, {"first": 250, "after": after})
        conn = data["products"]
        count = sum(1 for _ in conn["edges"])
        logging.info(f"[products] Seite {page}: edges={count} hasNext={conn['pageInfo']['hasNextPage']}")
        for edge in conn["edges"]:
            items.append(edge["node"])
        if not conn["pageInfo"]["hasNextPage"]:
            break
        after = conn["pageInfo"]["endCursor"]
    logging.info(f"Gesamt Produkte geladen: {len(items)}")
    return items

def get_location_id_graphql(shop_url: str, access_token: str, location_name: str) -> Optional[str]:
    after = None
    page = 0
    while True:
        page += 1
        data = gql(shop_url, access_token, GQL_LOCATIONS, {"first": 250, "after": after})
        conn = data["locations"]
        logging.info(f"[locations] Seite {page}: edges={len(conn['edges'])}")
        for edge in conn["edges"]:
            node = edge["node"]
            if node["name"] == location_name:
                return node["id"]
        if not conn["pageInfo"]["hasNextPage"]:
            break
        after = conn["pageInfo"]["endCursor"]
    logging.error(f"Keine Location-ID für '{location_name}' gefunden.")
    return None

# =========================
# Mapping / Matching
# =========================
def build_variant_maps(products: List[dict]) -> Tuple[Dict[str, str], Dict[str, List[str]], Dict[str, str], Dict[str, str]]:
    """
    Liefert:
      - sku_to_variant: SKU -> VariantGID
      - name_to_variants: norm(ProductTitle) -> [VariantGID]
      - extra_name_map: norm(ProductTitle + ' ' + VariantTitle) bzw. Barcode -> VariantGID
      - variant_to_product: VariantGID -> ProductGID  (für Bulk-Preisupdate je Produkt)
    """
    sku_to_variant: Dict[str, str] = {}
    name_to_variants: Dict[str, List[str]] = {}
    extra_name_map: Dict[str, str] = {}
    variant_to_product: Dict[str, str] = {}

    for p in products:
        p_id = p["id"]
        p_title = p.get("title") or ""
        p_title_n = _norm(p_title)
        name_to_variants.setdefault(p_title_n, [])

        for vedge in p.get("variants", {}).get("edges", []):
            v = vedge["node"]
            v_id = v["id"]
            variant_to_product[v_id] = p_id

            sku = (v.get("sku") or "").strip()
            if sku:
                if sku in sku_to_variant and sku_to_variant[sku] != v_id:
                    logging.warning(f"Doppelte SKU: {sku} – überschreibe Mapping.")
                sku_to_variant[sku] = v_id

            name_to_variants[p_title_n].append(v_id)

            v_title = v.get("title") or ""
            key_combo = _norm(f"{p_title} {v_title}")
            extra_name_map[key_combo] = v_id

            barcode = (v.get("barcode") or "").strip()
            if barcode:
                extra_name_map[barcode] = v_id

    return sku_to_variant, name_to_variants, extra_name_map, variant_to_product

def find_variant_id(row_sku: str,
                    row_name: str,
                    sku_to_variant: Dict[str, str],
                    name_to_variants: Dict[str, List[str]],
                    extra_name_map: Dict[str, str]) -> Optional[str]:
    # 1) SKU
    if row_sku:
        vid = sku_to_variant.get(row_sku)
        if vid:
            return vid

    # 2) Name exakt
    n = _norm(row_name)
    variants = name_to_variants.get(n)
    if variants:
        return variants[0]

    # 3) "Product - Variant" / "Product (…)" kürzen
    base = re.split(r"\s*-\s*|\s*\(", row_name, maxsplit=1)[0]
    base_n = _norm(base)
    variants = name_to_variants.get(base_n)
    if variants:
        return variants[0]

    # 4) vorsichtiger Prefix
    candidates = [k for k in name_to_variants.keys() if n.startswith(k) or k.startswith(n)]
    if len(candidates) == 1:
        return name_to_variants[candidates[0]][0]

    # 5) Kombiname oder Barcode
    vid = extra_name_map.get(n)
    if vid:
        return vid

    return None

# =========================
# Updates
# =========================
def update_prices_bulk(shop_url: str, access_token: str, product_id: str, updates: List[Tuple[str, str]]) -> bool:
    """
    Updates: Liste [(variant_gid, new_price_str)]
    Nutzt productVariantsBulkUpdate pro Produkt.
    """
    variants_input = [{"id": vid, "price": price_str} for vid, price_str in updates]
    data = gql(shop_url, access_token, GQL_VARIANTS_BULK_UPDATE, {"productId": product_id, "variants": variants_input})
    errs = data["productVariantsBulkUpdate"]["userErrors"]
    if errs:
        logging.error(f"Preis-UserErrors: {errs}")
        return False
    return True

def set_inventory(shop_url: str, access_token: str, location_gid: str, inventory_updates: List[Tuple[str, int]]) -> bool:
    """
    inventory_updates: [(inventoryItemGID, absolute_quantity)]
    Nutzt inventorySetQuantities (2024-07+). Setzt 'available' absolut.
    """
    input_payload = {
        "name": "available",             # 'available' oder 'on_hand'
        "reason": "correction",          # zulässiger Grund, siehe Docs
        "ignoreCompareQuantity": True,   # CAS aus -> direkt absolut setzen
        "quantities": [                  # <<< WICHTIG: 'quantities', nicht 'setQuantities'
            {
                "inventoryItemId": item_gid,
                "locationId": location_gid,
                "quantity": qty
                # optional: "compareQuantity": <alter Wert>, falls du CAS nutzen willst
            }
            for (item_gid, qty) in inventory_updates
        ],
        # optional, aber hilfreich fürs Audit-Log:
        # "referenceDocumentUri": "gid://erp-connector/SyncJob/SYNC-2025-09-22-17-43"
    }

    data = gql(shop_url, access_token, GQL_INVENTORY_SET, {"input": input_payload})
    errs = data["inventorySetQuantities"]["userErrors"]
    if errs:
        logging.error(f"Inventory-UserErrors: {errs}")
        return False
    return True

# =========================
# CSV-Verarbeitung (wie gehabt)
# =========================
import io

def process_csv(shop_url: str,
                access_token: str,
                csv_file_path: str,
                sku_column: str,
                name_column: str,
                price_column: str,
                stock_column: str,
                location_name: str) -> None:
    """
    Liest die CSV robust (Bytes -> UTF-8-SIG/UTF-8/CP1252-Fallback), matcht Zeilen auf Shopify-Varianten
    und führt Preis- und Lagerupdates via GraphQL aus (Bulk-Prices pro Produkt, Inventory in Batches).
    Erwartete Helpers: get_all_products_graphql, build_variant_maps, get_location_id_graphql,
                       column_letter_to_index, find_variant_id, update_prices_bulk, set_inventory.
    """

    # 0) CSV robust einlesen (als Bytes -> Decode-Fallbacks -> StringIO)
    def _read_csv_rows(path: str):
        with open(path, 'rb') as bf:
            raw = bf.read()

        # Versuch 1: utf-8-sig
        for enc in ('utf-8-sig', 'utf-8', 'cp1252', 'latin1'):
            try:
                text = raw.decode(enc)
                logging.info(f"CSV mit Encoding '{enc}' gelesen.")
                break
            except UnicodeDecodeError:
                continue
        else:
            # Als letzte Rettung: ersetzen (keine Exception mehr), damit Script weiterläuft
            text = raw.decode('utf-8', errors='replace')
            logging.warning("CSV konnte nicht sauber decodiert werden – verwende utf-8 mit 'replace'.")

        sio = io.StringIO(text)
        # Dein CSV nutzt ';' als Trennzeichen
        return csv.reader(sio, delimiter=';')

    reader = _read_csv_rows(csv_file_path)
    header = next(reader, None)  # Header ggf. überspringen

    # 1) Produkte + Varianten holen
    products = get_all_products_graphql(shop_url, access_token)
    if not products:
        logging.error("Keine Produkte geladen – Abbruch.")
        return

    sku_to_variant, name_to_variants, extra_name_map, variant_to_product = build_variant_maps(products)

    # 2) Location-ID via GraphQL
    location_gid = get_location_id_graphql(shop_url, access_token, location_name)
    if not location_gid:
        logging.error("Location konnte nicht ermittelt werden – Abbruch.")
        return

    # 3) Spaltenindizes bestimmen
    sku_idx = column_letter_to_index(sku_column)
    name_idx = column_letter_to_index(name_column)
    price_idx = column_letter_to_index(price_column)
    stock_idx = column_letter_to_index(stock_column)

    # 4) Updates sammeln
    price_updates_by_product: Dict[str, List[Tuple[str, str]]] = {}
    inventory_updates: List[Tuple[str, int]] = []

    line_no = 1 if header is None else 2
    for row in reader:
        need = max(sku_idx, name_idx, price_idx, stock_idx) + 1
        if len(row) < need:
            logging.warning(f"Zeile {line_no}: zu wenige Spalten – übersprungen: {row}")
            line_no += 1
            continue

        try:
            sku = row[sku_idx].strip()
            name = row[name_idx].strip()

            raw_price = row[price_idx].strip()
            if raw_price == "":
                logging.warning(f"Zeile {line_no}: kein Preis angegeben – übersprungen (SKU='{sku}', Name='{name}')")
                line_no += 1
                continue
            new_price = normalize_price_to_money_str(raw_price)  # <<< HIER neu

            stock_raw = row[stock_idx].strip()
            if stock_raw == "":
                logging.warning(f"Zeile {line_no}: kein Bestand angegeben – übersprungen (SKU='{sku}', Name='{name}')")
                line_no += 1
                continue
            new_stock = int(stock_raw)
        except Exception as e:
            logging.warning(f"Zeile {line_no}: Parsing-Fehler ({e}) – übersprungen: {row}")
            line_no += 1
            continue

        if new_price == "":
            logging.warning(f"Zeile {line_no}: kein Preis – übersprungen (SKU='{sku}', Name='{name}')")
            line_no += 1
            continue

        if stock_raw == "":
            logging.warning(f"Zeile {line_no}: kein Bestand – übersprungen (SKU='{sku}', Name='{name}')")
            line_no += 1
            continue

        try:
            new_stock = int(stock_raw)
        except ValueError:
            logging.warning(f"Zeile {line_no}: Bestand nicht numerisch ('{stock_raw}') – übersprungen.")
            line_no += 1
            continue

        variant_gid = find_variant_id(sku, name, sku_to_variant, name_to_variants, extra_name_map)
        if not variant_gid:
            logging.warning(f"Zeile {line_no}: Keine Variant-ID für SKU='{sku}' Name='{name}' – übersprungen.")
            line_no += 1
            continue

        product_gid = variant_to_product.get(variant_gid)
        if not product_gid:
            logging.warning(f"Zeile {line_no}: Kein Produkt zu Variant {variant_gid} – übersprungen.")
            line_no += 1
            continue

        # Preis vormerken
        price_updates_by_product.setdefault(product_gid, []).append((variant_gid, new_price))

        # inventoryItem-GID aus bereits geladenen Produkten ermitteln
        inv_item_gid = None
        found = False
        for p in products:
            if p["id"] != product_gid:
                continue
            for vedge in p["variants"]["edges"]:
                v = vedge["node"]
                if v["id"] == variant_gid:
                    inv = v.get("inventoryItem")
                    if inv:
                        inv_item_gid = inv.get("id")
                    found = True
                    break
            if found:
                break

        if inv_item_gid:
            inventory_updates.append((inv_item_gid, new_stock))
        else:
            logging.warning(f"Zeile {line_no}: inventoryItem-ID fehlt für Variant {variant_gid} – Inventur-Update übersprungen.")

        line_no += 1

    total_price_updates = sum(len(v) for v in price_updates_by_product.values())
    logging.info(f"Preisupdates vorbereitet: {total_price_updates} (über {len(price_updates_by_product)} Produkte)")
    logging.info(f"Inventory-Updates vorbereitet: {len(inventory_updates)}")

    if total_price_updates == 0 and not inventory_updates:
        logging.info("Keine Updates zu erledigen.")
        return

    # 5) Vorschau (kurz)
    logging.info("\n— Vorschau —")
    shown = 0
    for product_gid, lst in price_updates_by_product.items():
        for (vid, pstr) in lst:
            logging.info(f"Preis: Variant {vid} -> {pstr}  (Produkt {product_gid})")
            shown += 1
            if shown >= 6:
                break
        if shown >= 6:
            break
    for (inv_item_gid, qty) in inventory_updates[:6]:
        logging.info(f"Bestand: Item {inv_item_gid} @ {location_gid} -> {qty}")

    # 6) Bestätigung
    proceed = input("\nUpdates wirklich ausführen? (yes/no): ").strip().lower()
    if proceed != "yes":
        logging.info("Abgebrochen.")
        return

    # 7) Ausführen
    # 7a) Preise (Bulk je Produkt)
    ok_prices = 0
    for product_gid, updates in tqdm(price_updates_by_product.items(), desc="Preise aktualisieren"):
        if update_prices_bulk(shop_url, access_token, product_gid, updates):
            ok_prices += len(updates)

    # 7b) Inventory (in Batches)
    ok_inv = 0
    if inventory_updates:
        unique_inventory_updates = coalesce_inventory_updates(inventory_updates, location_gid)
        logging.info(f"Inventory-Updates nach Koaleszierung: {len(unique_inventory_updates)} (vorher {len(inventory_updates)})")

        BATCH = 250  # gern anpassen
        for i in tqdm(range(0, len(unique_inventory_updates), BATCH), desc="Bestände setzen"):
            chunk = unique_inventory_updates[i:i+BATCH]
            if set_inventory(shop_url, access_token, location_gid, chunk):
                ok_inv += len(chunk)

    logging.info(f"\nFertig. Preise OK: {ok_prices}/{total_price_updates}, Inventory OK: {ok_inv}/{len(inventory_updates)}")

# =========================
# Beispiel-Aufruf
# =========================
if __name__ == "__main__":
    shop_url = "https://b831c7-a9.myshopify.com"        # myshopify-Domain!
    access_token = "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"

    csv_file_path = r"C:\Users\admin\Desktop\artikel.csv"

    sku_column = "BK"   # SKU
    name_column = "C"   # Produktname
    price_column = "N"  # Neuer Preis
    stock_column = "AB" # Neuer Bestand

    location_name = "Osakaallee 2"

    process_csv(shop_url, access_token, csv_file_path, sku_column, name_column, price_column, stock_column, location_name)