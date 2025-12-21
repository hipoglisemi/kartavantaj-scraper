# Supabase Schema for KartAvantaj Scraper Integration

This document outlines the Supabase tables, columns, and mapping rules for the scraper project.

## 1. Tables Overview

| Table Name | Description |
| :--- | :--- |
| `campaigns` | Main table storeing all campaign data from banks. |
| `master_sectors` | Defines valid sectors (e.g., Market, Fuel, Clothing). Source of truth for classification. |
| `master_brands` | List of recognized brands (e.g., Migros, Shell, Zara). used for normalization. |
| `master_categories` | High-level categories (General, Food, Travel). |
| `bank_configs` | Configuration for banks (names, logos, etc.) - *Optional use by scraper.* |

---

## 2. Table: `campaigns`

This is the primary destination for scraped data. All scraping bots should upsert into this table.

| Column Name | Type | Description / Mapping Source | Rules & Notes |
| :--- | :--- | :--- | :--- |
| `id` | `bigint` | **Primary Key** | Auto-incremented. Do not send from scraper unless updating known ID. |
| `title` | `text` | Scraper: `title` | Required. The main headline of the campaign. |
| `description` | `text` | Scraper: `description` | Full text or HTML description. |
| `url` | `text` | Scraper: `url` | **Unique Key Candidate**. The original link. |
| `image` | `text` | Scraper: `image_url` | Direct URL to campaign banner image. |
| `bank` | `text` | Scraper: `bank_name` | **STRICT VALUES**: `Garanti BBVA`, `Yapı Kredi`, `İş Bankası`, `Akbank`, `QNB Finansbank`, `Ziraat Bankası`, `Halkbank`, `Vakıfbank`. |
| `card_name` | `text` | Scraper: `card_program` | E.g., `Axess`, `Bonus`, `Maximum`, `World`, `Bankkart`. |
| `category` | `text` | Scraper: `category` | High-level grouping. Matches `master_categories.name`. Default: 'Genel'. |
| `sector_slug` | `text` | Scraper: `sector_slug` | **CRITICAL**. Must match `master_sectors.slug`. Example: `market-gida`, `akaryakit`. |
| `brand` | `text` | Scraper: `brand_name` | The merchant name (e.g., `Trendyol`). Should match `master_brands.name` if possible. |
| `min_spend` | `numeric` | Scraper: `min_spend` | Extracted minimum spending amount (e.g., `1000`). No currency symbol. |
| `earning` | `text` | Scraper: `reward` | Text description of reward (e.g., `100 TL Puan`, `2 Taksit`). |
| `valid_until` | `date` | Scraper: `end_date` | Format: `YYYY-MM-DD`. Expiration date. |
| `valid_from` | `date` | Scraper: `start_date` | Format: `YYYY-MM-DD`. Start date. |
| `badge_text` | `text` | Scraper: Computed | Example: 'Fırsat', 'İndirim'. Short badge text. |
| `badge_color` | `text` | Scraper: Computed | Options: `purple` (Points), `emerald` (Installment), `orange` (Discount), `blue` (Miles), `gray` (Other). |
| `is_approved` | `boolean` | Default: `false` | Set to `false` initially. Admin approves later. |
| `eligible_customers`| `jsonb` | Scraper: `cards_list` | Array of strings. Specific card types eligible (e.g., `["Maximiles", "Maximum Genç"]`). |
| `conditions` | `jsonb` | Scraper: `conditions` | Array of strings. Valid terms or bullet points. |
| `participation_points`| `jsonb` | Scraper: `steps` | Array of strings. Steps to join (e.g., "Join via app"). |

---

## 3. Table: `master_sectors`

Use this table to look up valid `sector_slug` values. The scraper should fetch this list periodically or cache it.

| Column | Type | Purpose |
| :--- | :--- | :--- |
| `slug` | `text` | **The Key**. Use this in `campaigns.sector_slug`. (e.g., `market-gida`) |
| `name` | `text` | Display name (e.g., `Market & Gıda`). |
| `keywords` | `text[]`| Keywords for auto-matching (e.g., `['migros', 'carrefour']`). |

**Core Sectors List** (always fetch fresh from DB, but these are standard):
- `market-gida`
- `akaryakit`
- `giyim-aksesuar`
- `restoran-kafe`
- `elektronik`
- `e-ticaret`
- `turizm-konaklama`
- `ulasim`
- `dijital-platform`
- `kultur-sanat`
- `egitim`
- `sigorta`
- `otomotiv`
- `vergi-kamu`
- `diger`

---

## 4. Table: `master_brands`

Use to normalize merchant names.

| Column | Purpose |
| :--- | :--- |
| `name` | The brand name (e.g., 'Starbucks'). Store this in `campaigns.brand`. |

---

## 5. Table: `master_categories`

Broad categories for filtering.

| Column | Purpose |
| :--- | :--- |
| `name` | Category name (e.g., 'Giyim', 'Market', 'Genel'). Store this in `campaigns.category`. |

---
